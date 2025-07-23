#!/usr/bin/env python3
"""
URL Checker Script for Fern Docs Sitemap
Checks all URLs in the sitemap for 404 errors and other issues.
Follows complete redirect chains and flags home page redirects as errors.
"""

import xml.etree.ElementTree as ET
import requests
import time
import sys
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse

class URLChecker:
    def __init__(self, sitemap_path, max_workers=10, delay=0.1, timeout=30, max_redirects=10):
        self.sitemap_path = sitemap_path
        self.max_workers = max_workers
        self.delay = delay
        self.timeout = timeout
        self.max_redirects = max_redirects
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Fern-URL-Checker/1.0'
        })
        # Define the problematic home page URLs (multiple variations)
        self.home_page_urls = {
            'https://fern-api.docs.buildwithfern.com/learn/home',
            'https://fern-v2.docs.buildwithfern.com/learn/v2/home',
            'https://buildfern.com/learn/home',
            'https://fern-api.docs.buildwithfern.com/learn',
            'https://fern-v2.docs.buildwithfern.com/learn',
            'https://buildfern.com/learn'
        }
        # File handle for output logging
        self.output_file = None
        
    def log(self, message):
        """Print to console and write to file if file is open."""
        print(message)
        if self.output_file:
            self.output_file.write(message + '\n')
            self.output_file.flush()  # Ensure immediate write
        
    def parse_sitemap(self):
        """Parse the XML sitemap and extract all URLs."""
        try:
            tree = ET.parse(self.sitemap_path)
            root = tree.getroot()
            
            # Handle namespace
            namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            urls = []
            
            for url_elem in root.findall('ns:url', namespace):
                loc_elem = url_elem.find('ns:loc', namespace)
                if loc_elem is not None:
                    urls.append(loc_elem.text.strip())
            
            return urls
        except ET.ParseError as e:
            self.log(f"❌ Error parsing XML sitemap: {e}")
            return []
        except FileNotFoundError:
            self.log(f"❌ Sitemap file not found: {self.sitemap_path}")
            return []

    def is_home_page(self, url):
        """Check if a URL is a home page variant."""
        url_clean = url.rstrip('/')
        return url_clean in {u.rstrip('/') for u in self.home_page_urls}

    def follow_redirect_chain(self, url):
        """Follow redirects manually to track the complete chain."""
        redirect_chain = [url]
        current_url = url
        redirect_count = 0
        
        try:
            while redirect_count < self.max_redirects:
                # Make request without following redirects automatically
                response = self.session.get(current_url, timeout=self.timeout, allow_redirects=False)
                
                # If not a redirect, we're done - check final destination for home page
                if response.status_code not in [301, 302, 303, 307, 308]:
                    # Check if final destination is home page
                    is_home = self.is_home_page(current_url)
                    return {
                        'status_code': response.status_code,
                        'final_url': current_url,
                        'redirect_chain': redirect_chain,
                        'redirect_count': redirect_count,
                        'leads_to_home': is_home,
                        'home_at_step': redirect_count if is_home else None,
                        'error': None
                    }
                
                # Get redirect location
                location = response.headers.get('Location')
                if not location:
                    return {
                        'status_code': response.status_code,
                        'final_url': current_url,
                        'redirect_chain': redirect_chain,
                        'redirect_count': redirect_count,
                        'leads_to_home': False,
                        'home_at_step': None,
                        'error': 'Redirect response missing Location header'
                    }
                
                # Handle relative URLs
                if location.startswith('/'):
                    parsed_current = urlparse(current_url)
                    location = f"{parsed_current.scheme}://{parsed_current.netloc}{location}"
                elif not location.startswith('http'):
                    parsed_current = urlparse(current_url)
                    location = f"{parsed_current.scheme}://{parsed_current.netloc}/{location}"
                
                redirect_count += 1
                current_url = location
                redirect_chain.append(current_url)
                
                # Check if we've seen this URL before (redirect loop)
                if current_url in redirect_chain[:-1]:
                    return {
                        'status_code': response.status_code,
                        'final_url': current_url,
                        'redirect_chain': redirect_chain,
                        'redirect_count': redirect_count,
                        'leads_to_home': False,
                        'home_at_step': None,
                        'error': f'Redirect loop detected at step {redirect_count}'
                    }
                
                # Check if this intermediate redirect step leads to home page
                if self.is_home_page(current_url):
                    return {
                        'status_code': response.status_code,
                        'final_url': current_url,
                        'redirect_chain': redirect_chain,
                        'redirect_count': redirect_count,
                        'leads_to_home': True,
                        'home_at_step': redirect_count,
                        'error': None
                    }
            
            # Too many redirects - check if final URL is home page anyway
            is_home = self.is_home_page(current_url)
            return {
                'status_code': None,
                'final_url': current_url,
                'redirect_chain': redirect_chain,
                'redirect_count': redirect_count,
                'leads_to_home': is_home,
                'home_at_step': redirect_count if is_home else None,
                'error': f'Too many redirects (>{self.max_redirects})'
            }
            
        except requests.exceptions.RequestException as e:
            # Check if we ended up at home page even with an error
            is_home = self.is_home_page(current_url)
            return {
                'status_code': None,
                'final_url': current_url,
                'redirect_chain': redirect_chain,
                'redirect_count': redirect_count,
                'leads_to_home': is_home,
                'home_at_step': redirect_count if is_home else None,
                'error': str(e)
            }

    def check_url(self, url):
        """Check a single URL and return result with full redirect chain."""
        result = self.follow_redirect_chain(url)
        
        # Add original URL for reference
        result['original_url'] = url
        result['redirected'] = len(result['redirect_chain']) > 1
        
        return result

    def check_urls(self, urls):
        """Check all URLs concurrently."""
        results = []
        failed_urls = []
        redirect_urls = []
        home_redirect_urls = []
        
        self.log(f"🔍 Checking {len(urls)} URLs...")
        self.log(f"⚙️  Using {self.max_workers} workers with {self.delay}s delay")
        self.log(f"🔄 Following up to {self.max_redirects} redirects per URL")
        self.log("=" * 60)
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all URL check tasks
            future_to_url = {executor.submit(self.check_url, url): url for url in urls}
            
            for i, future in enumerate(as_completed(future_to_url), 1):
                result = future.result()
                results.append(result)
                
                # Add delay between requests
                if self.delay > 0:
                    time.sleep(self.delay)
                
                # Print progress
                if i % 50 == 0 or i == len(urls):
                    self.log(f"Progress: {i}/{len(urls)} URLs checked")
                
                # Categorize results
                original_url = result['original_url']
                
                if result['error']:
                    failed_urls.append(result)
                    self.log(f"❌ ERROR: {original_url} - {result['error']}")
                    if result['redirect_count'] > 0:
                        self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
                elif result['leads_to_home']:
                    home_redirect_urls.append(result)
                    self.log(f"🏠 HOME REDIRECT: {original_url} → HOME (step {result['home_at_step']})")
                    self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
                elif result['status_code'] == 404:
                    failed_urls.append(result)
                    self.log(f"❌ 404: {original_url}")
                    if result['redirect_count'] > 0:
                        self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
                elif result['status_code'] and result['status_code'] >= 400:
                    failed_urls.append(result)
                    self.log(f"⚠️  {result['status_code']}: {original_url}")
                    if result['redirect_count'] > 0:
                        self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
                elif result['redirected']:
                    redirect_urls.append(result)
                    self.log(f"🔄 REDIRECT ({result['redirect_count']} steps): {original_url} → {result['final_url']}")
                    if result['redirect_count'] > 1:
                        self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
                elif result['status_code'] == 200:
                    self.log(f"✅ OK: {original_url}")
                else:
                    self.log(f"ℹ️  {result['status_code']}: {original_url}")
        
        return results, failed_urls, redirect_urls, home_redirect_urls

    def print_summary(self, results, failed_urls, redirect_urls, home_redirect_urls):
        """Print summary of results."""
        self.log("\n" + "=" * 60)
        self.log("📊 SUMMARY")
        self.log("=" * 60)
        
        total_urls = len(results)
        success_urls = len([r for r in results if r['status_code'] == 200 and not r['error'] and not r['leads_to_home']])
        
        self.log(f"Total URLs checked: {total_urls}")
        self.log(f"✅ Successful (200): {success_urls}")
        self.log(f"🔄 Redirects (working): {len(redirect_urls)}")
        self.log(f"🏠 Home page redirects (ERROR): {len(home_redirect_urls)}")
        self.log(f"❌ Failed/Errors: {len(failed_urls)}")
        
        if home_redirect_urls:
            self.log(f"\n🏠 HOME PAGE REDIRECTS - FLAGGED AS ERRORS ({len(home_redirect_urls)}):")
            self.log("-" * 40)
            self.log("⚠️  These URLs redirect to the home page instead of specific content:")
            for result in home_redirect_urls:
                self.log(f"{result['original_url']} (step {result['home_at_step']})")
                self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
        
        if failed_urls:
            self.log(f"\n❌ FAILED URLS ({len(failed_urls)}):")
            self.log("-" * 40)
            for result in failed_urls:
                if result['error']:
                    self.log(f"ERROR: {result['original_url']} - {result['error']}")
                else:
                    self.log(f"{result['status_code']}: {result['original_url']}")
                if result['redirect_count'] > 0:
                    self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
        
        if redirect_urls:
            self.log(f"\n🔄 WORKING REDIRECTED URLS ({len(redirect_urls)}):")
            self.log("-" * 40)
            for result in redirect_urls:
                self.log(f"{result['original_url']} → {result['final_url']} ({result['redirect_count']} steps)")
                if result['redirect_count'] > 1:
                    self.log(f"   Chain: {' → '.join(result['redirect_chain'])}")
        
        # Home redirects are now considered errors
        total_errors = len(failed_urls) + len(home_redirect_urls)
        return total_errors == 0

def main():
    parser = argparse.ArgumentParser(description='Check URLs in Fern sitemap for 404 errors and home redirects')
    parser.add_argument('--sitemap', default='fern/docs.xml', help='Path to sitemap XML file')
    parser.add_argument('--workers', type=int, default=10, help='Number of concurrent workers')
    parser.add_argument('--delay', type=float, default=0.1, help='Delay between requests (seconds)')
    parser.add_argument('--timeout', type=int, default=30, help='Request timeout (seconds)')
    parser.add_argument('--max-redirects', type=int, default=10, help='Maximum number of redirects to follow')
    parser.add_argument('--max-urls', type=int, help='Limit number of URLs to check (for testing)')
    parser.add_argument('--output', default='check_urls_output.txt', help='Output file path')
    
    args = parser.parse_args()
    
    checker = URLChecker(args.sitemap, args.workers, args.delay, args.timeout, args.max_redirects)
    
    # Open output file for writing
    try:
        checker.output_file = open(args.output, 'w', encoding='utf-8')
        checker.log(f"📝 Output will be saved to: {args.output}")
    except IOError as e:
        print(f"❌ Error opening output file {args.output}: {e}")
        sys.exit(1)
    
    try:
        checker.log("🚀 Fern Docs URL Checker - Enhanced Redirect Tracking")
        checker.log("=" * 60)
        
        # Parse sitemap
        urls = checker.parse_sitemap()
        if not urls:
            checker.log("❌ No URLs found in sitemap")
            sys.exit(1)
        
        # Limit URLs if specified (for testing)
        if args.max_urls:
            urls = urls[:args.max_urls]
            checker.log(f"🔬 Testing mode: checking first {len(urls)} URLs")
        
        # Check URLs
        results, failed_urls, redirect_urls, home_redirect_urls = checker.check_urls(urls)
        
        # Print summary and exit
        success = checker.print_summary(results, failed_urls, redirect_urls, home_redirect_urls)
        
        checker.log(f"\n📁 Results saved to: {args.output}")
        
        # Exit with error code if there are any issues (including home redirects)
        total_issues = len(failed_urls) + len(home_redirect_urls)
        if total_issues > 0:
            checker.log(f"\n❌ Found {total_issues} issues (including home redirects)")
            sys.exit(1)
        else:
            checker.log(f"\n✅ All URLs are working correctly!")
            sys.exit(0)
        
    finally:
        # Close output file
        if checker.output_file:
            checker.output_file.close()

if __name__ == "__main__":
    main() 