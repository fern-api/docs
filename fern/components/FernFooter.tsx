declare const React: any;
const { useState, useEffect } = React;

/* ─── Inline SVG Icons ─── */

function BuiltWithFernLight({ className = "" }: { className?: string }) {
  return (
    <svg width={145} height={16} viewBox="0 0 145 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9.79656 4.8H14.5006C15.5139 4.8 16.3192 5.05067 16.9166 5.552C17.5139 6.04267 17.8126 6.71467 17.8126 7.568C17.8126 8.112 17.6739 8.608 17.3966 9.056C17.1192 9.504 16.7512 9.84 16.2926 10.064C16.8579 10.2667 17.3059 10.608 17.6366 11.088C17.9672 11.5573 18.1326 12.1173 18.1326 12.768C18.1326 13.7387 17.8286 14.5227 17.2206 15.12C16.6126 15.7067 15.7752 16 14.7086 16H9.79656V4.8ZM14.4846 14.528C15.1246 14.528 15.6206 14.3627 15.9726 14.032C16.3246 13.7013 16.5006 13.2373 16.5006 12.64C16.5006 12.0427 16.3246 11.5893 15.9726 11.28C15.6312 10.96 15.1352 10.8 14.4846 10.8H11.3966V14.528H14.4846ZM14.2766 9.424C14.8846 9.424 15.3539 9.28533 15.6846 9.008C16.0152 8.72 16.1806 8.32533 16.1806 7.824C16.1806 7.32267 16.0152 6.93867 15.6846 6.672C15.3539 6.40533 14.8846 6.272 14.2766 6.272H11.3966V9.424H14.2766ZM22.5778 16.224C21.6285 16.224 20.8871 15.9413 20.3538 15.376C19.8205 14.8107 19.5538 14 19.5538 12.944V8.304H21.1058V12.8C21.1058 13.472 21.2551 13.9787 21.5538 14.32C21.8631 14.6507 22.3005 14.816 22.8658 14.816C23.4525 14.816 23.9165 14.6293 24.2578 14.256C24.6098 13.872 24.7858 13.3707 24.7858 12.752V8.304H26.3378V16H24.9618V15.12C24.7165 15.4827 24.3858 15.76 23.9698 15.952C23.5538 16.1333 23.0898 16.224 22.5778 16.224ZM28.0746 8.304H29.6266V16H28.0746V8.304ZM27.9786 4.912H29.7066V6.752H27.9786V4.912ZM33.0334 16C32.4894 16 32.0948 15.888 31.8494 15.664C31.6041 15.44 31.4814 15.0667 31.4814 14.544V4.8H33.0334V14.064C33.0334 14.2667 33.0761 14.416 33.1614 14.512C33.2468 14.5973 33.3854 14.64 33.5774 14.64H34.5534V16H33.0334ZM37.9539 16C37.2819 16 36.7966 15.856 36.4979 15.568C36.1993 15.28 36.0499 14.8053 36.0499 14.144V9.664H34.0339V8.304H36.0499V6H37.6019V8.304H40.0179V9.664H37.6019V13.84C37.6019 14.1173 37.6659 14.32 37.7939 14.448C37.9219 14.576 38.1299 14.64 38.4179 14.64H40.0179V16H37.9539ZM43.5709 8.304H45.1869L46.8989 14.272L48.6109 8.304H50.3869L52.0989 14.272L53.8109 8.304H55.4269L53.0429 16H51.2189L49.5069 10.064L47.7789 16H45.9549L43.5709 8.304ZM56.3746 8.304H57.9266V16H56.3746V8.304ZM56.2786 4.912H58.0066V6.752H56.2786V4.912ZM62.5971 16C61.9251 16 61.4397 15.856 61.1411 15.568C60.8424 15.28 60.6931 14.8053 60.6931 14.144V9.664H58.6771V8.304H60.6931V6H62.2451V8.304H64.6611V9.664H62.2451V13.84C62.2451 14.1173 62.3091 14.32 62.4371 14.448C62.5651 14.576 62.7731 14.64 63.0611 14.64H64.6611V16H62.5971ZM65.6727 4.8H67.2247V9.056C67.4807 8.736 67.8007 8.496 68.1847 8.336C68.5794 8.16533 69.0114 8.08 69.4807 8.08C70.4407 8.08 71.1927 8.368 71.7367 8.944C72.2807 9.50933 72.5527 10.3147 72.5527 11.36V16H71.0007V11.504C71.0007 10.832 70.8407 10.3307 70.5207 10C70.2114 9.65867 69.7687 9.488 69.1927 9.488C68.5954 9.488 68.1154 9.68 67.7527 10.064C67.4007 10.4373 67.2247 10.9333 67.2247 11.552V16H65.6727V4.8Z" fill="#1E1F24" />
      <path d="M92.3849 7.82856C91.3321 6.93847 89.746 6.58166 88.3403 7.62074C88.2756 7.66779 88.1952 7.58741 88.2442 7.52468C88.5775 7.09532 88.9638 6.63263 89.2755 6.16798C89.5931 5.69157 90.0675 5.35044 90.6145 5.18379C93.5259 4.30155 92.6515 0.00012207 92.6515 0.00012207C92.6515 0.00012207 88.154 0.290282 88.7089 4.17019C88.801 4.81913 88.6285 5.47983 88.2227 5.99545C87.7247 6.62479 87.1463 7.22667 86.7268 7.66191C86.6385 7.7521 86.4895 7.66583 86.5248 7.54428C86.9307 6.17778 87.2267 4.06432 85.821 2.70175L83.8428 1.05881L83.4625 1.56071C82.3312 3.05268 82.6626 5.15634 84.1565 6.28561C85.0132 6.93259 85.4014 7.63643 85.3407 8.40888C85.3034 8.87157 85.0936 9.30485 84.7799 9.64794C84.1898 10.2949 83.6389 10.9889 83.2135 11.7928C83.1546 11.9045 82.9841 11.8614 82.99 11.734C83.0507 10.4067 82.9233 7.41489 80.6883 6.34639L78.1866 5.37984L77.9925 5.9582C77.3632 7.82464 78.3925 9.81851 80.257 10.4518C81.8783 11.0027 82.4567 12.0476 82.0665 13.6141C82.0489 13.671 81.7666 15.2845 81.8058 16.0001H83.6036C83.6644 14.8904 84.829 14.1611 85.8386 14.614C86.1229 14.7414 86.415 14.9238 86.715 15.159C88.3227 16.4255 90.691 16.1256 91.9555 14.516L92.3163 14.0572L90.0421 12.4241C88.4815 11.1968 86.3994 11.7516 84.8584 12.8024C84.729 12.8907 84.5643 12.7495 84.6368 12.6084C86.4993 8.95391 88.9206 8.96175 89.8695 9.77341C91.0204 10.7576 92.7633 10.5812 93.7396 9.4264L94.02 9.09507L92.3829 7.82856H92.3849Z" fill="#51C233" />
      <path d="M111.257 4.27539C114.524 4.27557 116.739 6.46855 116.739 9.98145C116.739 10.3833 116.718 10.788 116.673 11.2568H108.84C108.974 12.6434 109.892 13.4053 111.391 13.4053C112.398 13.4052 113.045 12.9803 113.338 12.375H116.538C115.888 14.5682 114.189 16 111.37 16C107.991 15.9998 105.754 13.6502 105.754 10.0703H105.751C105.751 6.55739 107.99 4.27539 111.257 4.27539ZM132.095 4.27539C134.801 4.2756 136.503 6.02159 136.503 8.95117V15.665H133.369V9.28613C133.369 7.81028 132.697 7.09379 131.444 7.09375C130.192 7.09375 129.362 7.96679 129.362 9.37598V15.6621H126.23V4.61035H128.984V5.72852C129.634 4.76615 130.82 4.27539 132.095 4.27539ZM106.379 2.72949H103.313C102.663 2.72949 102.305 2.99745 102.305 3.64746V4.60938H105.706V7.33887H102.305V15.6621H99.171V7.33887H96.42V4.60938H99.171V3.26758C99.171 1.11907 100.402 0 102.528 0H106.379V2.72949ZM120.583 6.55371C120.851 5.30087 121.747 4.60645 123.156 4.60645H125.126V4.98535C125.126 6.28287 124.074 7.33493 122.776 7.33496C121.546 7.33496 120.963 7.96297 120.963 9.21582V15.6611H117.829V4.60645H120.583V6.55371ZM111.257 6.73633C109.736 6.73633 108.907 7.58722 108.818 8.88477H113.584V8.83984C113.584 7.58713 112.778 6.73647 111.257 6.73633Z" fill="#1E1F24" />
    </svg>
  );
}

function BuiltWithFernDark({ className = "" }: { className?: string }) {
  return (
    <svg width={145} height={16} viewBox="0 0 145 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9.79656 4.8H14.5006C15.5139 4.8 16.3192 5.05067 16.9166 5.552C17.5139 6.04267 17.8126 6.71467 17.8126 7.568C17.8126 8.112 17.6739 8.608 17.3966 9.056C17.1192 9.504 16.7512 9.84 16.2926 10.064C16.8579 10.2667 17.3059 10.608 17.6366 11.088C17.9672 11.5573 18.1326 12.1173 18.1326 12.768C18.1326 13.7387 17.8286 14.5227 17.2206 15.12C16.6126 15.7067 15.7752 16 14.7086 16H9.79656V4.8ZM14.4846 14.528C15.1246 14.528 15.6206 14.3627 15.9726 14.032C16.3246 13.7013 16.5006 13.2373 16.5006 12.64C16.5006 12.0427 16.3246 11.5893 15.9726 11.28C15.6312 10.96 15.1352 10.8 14.4846 10.8H11.3966V14.528H14.4846ZM14.2766 9.424C14.8846 9.424 15.3539 9.28533 15.6846 9.008C16.0152 8.72 16.1806 8.32533 16.1806 7.824C16.1806 7.32267 16.0152 6.93867 15.6846 6.672C15.3539 6.40533 14.8846 6.272 14.2766 6.272H11.3966V9.424H14.2766ZM22.5778 16.224C21.6285 16.224 20.8871 15.9413 20.3538 15.376C19.8205 14.8107 19.5538 14 19.5538 12.944V8.304H21.1058V12.8C21.1058 13.472 21.2551 13.9787 21.5538 14.32C21.8631 14.6507 22.3005 14.816 22.8658 14.816C23.4525 14.816 23.9165 14.6293 24.2578 14.256C24.6098 13.872 24.7858 13.3707 24.7858 12.752V8.304H26.3378V16H24.9618V15.12C24.7165 15.4827 24.3858 15.76 23.9698 15.952C23.5538 16.1333 23.0898 16.224 22.5778 16.224ZM28.0746 8.304H29.6266V16H28.0746V8.304ZM27.9786 4.912H29.7066V6.752H27.9786V4.912ZM33.0334 16C32.4894 16 32.0948 15.888 31.8494 15.664C31.6041 15.44 31.4814 15.0667 31.4814 14.544V4.8H33.0334V14.064C33.0334 14.2667 33.0761 14.416 33.1614 14.512C33.2468 14.5973 33.3854 14.64 33.5774 14.64H34.5534V16H33.0334ZM37.9539 16C37.2819 16 36.7966 15.856 36.4979 15.568C36.1993 15.28 36.0499 14.8053 36.0499 14.144V9.664H34.0339V8.304H36.0499V6H37.6019V8.304H40.0179V9.664H37.6019V13.84C37.6019 14.1173 37.6659 14.32 37.7939 14.448C37.9219 14.576 38.1299 14.64 38.4179 14.64H40.0179V16H37.9539ZM43.5709 8.304H45.1869L46.8989 14.272L48.6109 8.304H50.3869L52.0989 14.272L53.8109 8.304H55.4269L53.0429 16H51.2189L49.5069 10.064L47.7789 16H45.9549L43.5709 8.304ZM56.3746 8.304H57.9266V16H56.3746V8.304ZM56.2786 4.912H58.0066V6.752H56.2786V4.912ZM62.5971 16C61.9251 16 61.4397 15.856 61.1411 15.568C60.8424 15.28 60.6931 14.8053 60.6931 14.144V9.664H58.6771V8.304H60.6931V6H62.2451V8.304H64.6611V9.664H62.2451V13.84C62.2451 14.1173 62.3091 14.32 62.4371 14.448C62.5651 14.576 62.7731 14.64 63.0611 14.64H64.6611V16H62.5971ZM65.6727 4.8H67.2247V9.056C67.4807 8.736 67.8007 8.496 68.1847 8.336C68.5794 8.16533 69.0114 8.08 69.4807 8.08C70.4407 8.08 71.1927 8.368 71.7367 8.944C72.2807 9.50933 72.5527 10.3147 72.5527 11.36V16H71.0007V11.504C71.0007 10.832 70.8407 10.3307 70.5207 10C70.2114 9.65867 69.7687 9.488 69.1927 9.488C68.5954 9.488 68.1154 9.68 67.7527 10.064C67.4007 10.4373 67.2247 10.9333 67.2247 11.552V16H65.6727V4.8Z" fill="#EEEEF0" />
      <path d="M92.3848 7.82856C91.332 6.93847 89.7459 6.58166 88.3402 7.62074C88.2755 7.66779 88.1952 7.58741 88.2442 7.52468C88.5775 7.09532 88.9637 6.63263 89.2754 6.16798C89.593 5.69157 90.0675 5.35044 90.6145 5.18379C93.5259 4.30155 92.6515 0.00012207 92.6515 0.00012207C92.6515 0.00012207 88.154 0.290282 88.7088 4.17019C88.801 4.81913 88.6284 5.47983 88.2226 5.99545C87.7246 6.62479 87.1463 7.22667 86.7267 7.66191C86.6385 7.7521 86.4895 7.66583 86.5248 7.54428C86.9306 6.17778 87.2266 4.06432 85.8209 2.70175L83.8427 1.05881L83.4624 1.56071C82.3312 3.05268 82.6625 5.15634 84.1564 6.28561C85.0132 6.93259 85.4014 7.63643 85.3406 8.40888C85.3033 8.87157 85.0936 9.30485 84.7799 9.64794C84.1898 10.2949 83.6388 10.9889 83.2134 11.7928C83.1546 11.9045 82.984 11.8614 82.9899 11.734C83.0507 10.4067 82.9232 7.41489 80.6882 6.34639L78.1866 5.37984L77.9925 5.9582C77.3631 7.82464 78.3924 9.81851 80.2569 10.4518C81.8783 11.0027 82.4566 12.0476 82.0665 13.6141C82.0488 13.671 81.7665 15.2845 81.8057 16.0001H83.6036C83.6643 14.8904 84.8289 14.1611 85.8386 14.614C86.1229 14.7414 86.415 14.9238 86.7149 15.159C88.3226 16.4255 90.6909 16.1256 91.9555 14.516L92.3162 14.0572L90.042 12.4241C88.4814 11.1968 86.3993 11.7516 84.8583 12.8024C84.7289 12.8907 84.5642 12.7495 84.6368 12.6084C86.4993 8.95391 88.9206 8.96175 89.8695 9.77341C91.0203 10.7576 92.7632 10.5812 93.7396 9.4264L94.0199 9.09507L92.3829 7.82856H92.3848Z" fill="#51C233" />
      <path d="M111.257 4.27539C114.524 4.27557 116.739 6.46855 116.739 9.98145C116.739 10.3833 116.718 10.788 116.673 11.2568H108.84C108.974 12.6434 109.892 13.4053 111.391 13.4053C112.398 13.4052 113.045 12.9803 113.338 12.375H116.538C115.888 14.5682 114.189 16 111.37 16C107.991 15.9998 105.754 13.6502 105.754 10.0703H105.751C105.751 6.55739 107.989 4.27539 111.257 4.27539ZM132.095 4.27539C134.801 4.2756 136.503 6.02159 136.503 8.95117V15.665H133.369V9.28613C133.369 7.81028 132.697 7.09379 131.444 7.09375C130.191 7.09375 129.362 7.96679 129.362 9.37598V15.6621H126.229V4.61035H128.983V5.72852C129.633 4.76615 130.82 4.27539 132.095 4.27539ZM106.379 2.72949H103.312C102.662 2.72949 102.305 2.99745 102.305 3.64746V4.60938H105.706V7.33887H102.305V15.6621H99.1709V7.33887H96.4199V4.60938H99.1709V3.26758C99.1709 1.11907 100.402 0 102.528 0H106.379V2.72949ZM120.583 6.55371C120.851 5.30087 121.747 4.60645 123.156 4.60645H125.126V4.98535C125.126 6.28287 124.074 7.33493 122.776 7.33496C121.546 7.33496 120.963 7.96297 120.963 9.21582V15.6611H117.829V4.60645H120.583V6.55371ZM111.257 6.73633C109.736 6.73633 108.907 7.58722 108.817 8.88477H113.584V8.83984C113.584 7.58713 112.777 6.73647 111.257 6.73633Z" fill="#EEEEF0" />
    </svg>
  );
}

function GitHubIcon({ color = "#62636C", className = "" }: { color?: string; className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M13.75 17.8332V15.4998C13.8311 14.7691 13.6216 14.0357 13.1667 13.4582C14.9167 13.4582 16.6667 12.2915 16.6667 10.2498C16.7133 9.52067 16.5092 8.80317 16.0833 8.20817C16.2467 7.53734 16.2467 6.83734 16.0833 6.1665C16.0833 6.1665 15.5 6.1665 14.3333 7.0415C12.7933 6.74984 11.2067 6.74984 9.66666 7.0415C8.5 6.1665 7.91666 6.1665 7.91666 6.1665C7.74166 6.83734 7.74166 7.53734 7.91666 8.20817C7.49192 8.80077 7.28577 9.5223 7.33333 10.2498C7.33333 12.2915 9.08333 13.4582 10.8333 13.4582C10.6058 13.744 10.4367 14.0707 10.3375 14.4207C10.2383 14.7707 10.2092 15.1382 10.25 15.4998V17.8332" stroke={color} strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.25 15.5002C7.61917 16.6668 7.33334 14.3335 6.16667 14.3335" stroke={color} strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ color = "#62636C", className = "" }: { color?: string; className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M15.4458 6.57812H17.2771L13.2771 11.1805L18 17.4215H14.2892L11.3976 13.6384L8.07229 17.4215H6.24096L10.5301 12.5058L6 6.57812H9.80723L12.4337 10.048L15.4458 6.57812ZM14.7952 16.3131H15.8072L9.25301 7.61427H8.14458L14.7952 16.3131Z" fill={color} />
    </svg>
  );
}

function LinkedInIcon({ color = "#62636C", className = "" }: { color?: string; className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M15.5722 15.5369H14.0687V13.2056C14.0687 12.6497 14.0587 11.9341 13.2868 11.9341C12.5037 11.9341 12.3839 12.5398 12.3839 13.1652V15.5368H10.8805V10.7427H12.3238V11.3979H12.344C12.4884 11.1533 12.6971 10.9522 12.9479 10.8158C13.1987 10.6794 13.4821 10.613 13.768 10.6235C15.2918 10.6235 15.5728 11.6159 15.5728 12.907L15.5722 15.5369ZM9.18409 10.0874C9.01153 10.0874 8.84283 10.0368 8.69934 9.94191C8.55585 9.84701 8.444 9.71211 8.37794 9.55427C8.31188 9.39643 8.29456 9.22274 8.3282 9.05516C8.36183 8.88758 8.4449 8.73363 8.5669 8.6128C8.68889 8.49196 8.84434 8.40966 9.01357 8.37629C9.18281 8.34293 9.35823 8.36001 9.51767 8.42536C9.6771 8.49072 9.81338 8.60142 9.90927 8.74347C10.0052 8.88551 10.0564 9.05253 10.0564 9.22338C10.0564 9.33683 10.0339 9.44917 9.99005 9.55399C9.94622 9.6588 9.88198 9.75405 9.80097 9.83428C9.71997 9.91451 9.6238 9.97816 9.51795 10.0216C9.41211 10.065 9.29866 10.0874 9.18409 10.0874ZM9.93581 15.5369H8.4308V10.7427H9.93581V15.5369ZM16.3217 6.97725H7.67532C7.47907 6.97505 7.28997 7.0501 7.14957 7.18588C7.00917 7.32167 6.92897 7.50709 6.92657 7.70141V16.2981C6.92889 16.4925 7.00904 16.6781 7.14943 16.814C7.28983 16.95 7.47898 17.0251 7.67532 17.0231H16.3217C16.5184 17.0255 16.7081 16.9505 16.8491 16.8146C16.99 16.6787 17.0707 16.4929 17.0734 16.2981V7.70079C17.0706 7.50609 16.9899 7.32045 16.8489 7.18467C16.708 7.04889 16.5183 6.97406 16.3217 6.97663" fill={color} />
    </svg>
  );
}

function Soc2Badge({ className = "" }: { className?: string }) {
  return (
    <svg width={32} height={32} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M256 0C397.385 0 512 114.615 512 256C512 397.385 397.385 512 256 512C114.615 512 0 397.385 0 256C0 114.615 114.615 0 256 0ZM256 64C149.961 64 64 149.961 64 256C64 362.039 149.961 448 256 448C362.039 448 448 362.039 448 256C448 149.961 362.039 64 256 64Z" fill="#4A4B55" />
      <circle cx="256" cy="256" r="254" stroke="#555660" strokeWidth="4" />
      <circle cx="256" cy="256" r="190" fill="#2A2B33" stroke="#555660" strokeWidth="4" />
      <text x="256" y="230" textAnchor="middle" fill="white" fontSize="100" fontWeight="bold" fontFamily="sans-serif">SOC</text>
      <text x="256" y="330" textAnchor="middle" fill="white" fontSize="110" fontWeight="bold" fontFamily="sans-serif">2</text>
    </svg>
  );
}

/* ─── Status Widget ─── */

function FernStatusWidget() {
  const [status, setStatus] = useState({
    dotClass: 'is-loading',
    statusMessage: 'Checking status...'
  });

  const apiEndpoint = 'https://status.buildwithfern.com/api/v1/summary';

  const getBackgroundColor = (dotClass: string) => {
    switch (dotClass) {
      case 'is-green': return '#00c853';
      case 'is-red': return '#f44336';
      case 'is-orange': return '#ff9800';
      case 'is-blue': return '#2196f3';
      case 'is-yellow': return '#ffc107';
      case 'is-loading': return '#cccccc';
      default: return '#cccccc';
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(apiEndpoint);
        if (response.ok) {
          const data = await response.json();
          let dotClass = 'is-green';
          let statusMessage = 'All systems operational';

          if (data.ongoing_incidents && data.ongoing_incidents.length > 0) {
            let worstImpact = 0;
            for (const incident of data.ongoing_incidents) {
              let impactLevel = 0;
              if (incident.current_worst_impact === 'degraded_performance') impactLevel = 1;
              else if (incident.current_worst_impact === 'partial_outage') impactLevel = 2;
              else if (incident.current_worst_impact === 'full_outage') impactLevel = 3;
              if (impactLevel > worstImpact) worstImpact = impactLevel;
            }
            if (worstImpact === 3) { dotClass = 'is-red'; statusMessage = 'Service outage'; }
            else if (worstImpact === 2) { dotClass = 'is-orange'; statusMessage = 'Partial outage'; }
            else if (worstImpact === 1) { dotClass = 'is-yellow'; statusMessage = 'Degraded performance'; }
          }

          if (data.in_progress_maintenances && data.in_progress_maintenances.length > 0) {
            if (dotClass === 'is-green') { dotClass = 'is-blue'; statusMessage = 'Maintenance in progress'; }
          }

          if (data.scheduled_maintenances && data.scheduled_maintenances.length > 0) {
            if (dotClass === 'is-green') {
              const now = new Date();
              for (const m of data.scheduled_maintenances) {
                const startsAt = new Date(m.starts_at);
                if ((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60) <= 24) {
                  dotClass = 'is-blue';
                  statusMessage = 'Scheduled maintenance soon';
                  break;
                }
              }
            }
          }

          setStatus({ dotClass, statusMessage });
        } else {
          setStatus({ dotClass: 'is-red', statusMessage: 'Cannot check status' });
        }
      } catch {
        setStatus({ dotClass: 'is-red', statusMessage: 'Cannot check status' });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <a
      href="https://status.buildwithfern.com"
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderRadius: '9999px',
        padding: '0.25rem 0.75rem',
        alignSelf: 'flex-start',
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
        height: '2rem',
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          marginRight: '8px',
          display: 'inline-block',
          backgroundColor: getBackgroundColor(status.dotClass),
          boxShadow: `0 0 6px 2px ${getBackgroundColor(status.dotClass)}60`,
        }} />
        <span style={{
          fontSize: '0.875rem',
          color: 'var(--grayscale-10)',
          fontWeight: 400,
        }}>{status.statusMessage}</span>
      </div>
    </a>
  );
}

/* ─── Footer Component ─── */

export default function FernFooter() {
  return (
    <>
      <style>{`
        #fern-footer {
          position: relative;
          border-top: 1px solid var(--border);
        }

        .fern-cf {
          padding: 3rem 2rem;
          width: 100%;
          max-width: calc(var(--page-width, 88rem) + 4rem);
          margin: 0 auto;
        }

        .fern-cf-top {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          margin-bottom: 3rem;
          position: relative;
        }

        .fern-cf-logo {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .fern-cf-logo svg {
          transition: filter 150ms ease;
        }

        .fern-cf-logo:hover svg {
          filter: saturate(1) opacity(1);
        }

        .fern-cf-logo-img {
          height: 1rem;
          margin: 0;
          filter: saturate(0) opacity(0.7);
          transform: translateX(-0.5rem);
        }

        .fern-cf-status {
          display: flex;
          flex-direction: row;
          gap: 1rem;
        }

        .fern-cf-status-text {
          font-size: 0.875rem;
          color: var(--grayscale-10);
          font-weight: 400;
        }

        .fern-cf-soc2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 9999px;
          padding: 0.25rem 0.75rem 0.25rem 0.25rem;
          align-self: flex-start;
          text-decoration: none;
          transition: background-color 150ms ease, color 150ms ease;
        }

        .fern-cf-soc2:hover {
          background-color: var(--grayscale-a4);
        }

        .fern-cf-soc2:hover .fern-cf-status-text {
          color: var(--grayscale-12);
        }

        .fern-cf-soc2-img {
          width: 1.5rem;
          height: 1.5rem;
          background-color: #62636C;
          border-radius: 1000px;
        }

        .fern-cf-links {
          display: flex;
          gap: 2rem;
          padding-top: 2rem;
          align-items: flex-end;
          justify-content: space-between;
          width: 100%;
        }

        .fern-cf-columns {
          display: flex;
          gap: 2rem;
          flex: 1;
          max-width: 40rem;
        }

        .fern-cf-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex: 1;
          min-width: 120px;
        }

        .fern-cf-column-title {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--grayscale-9);
          letter-spacing: -0.025em;
        }

        .fern-cf-column-links {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .fern-cf-socials {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .fern-cf-social-icon {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.25rem;
        }

        .fern-cf-social-icon:hover {
          background-color: var(--grayscale-a4);
        }

        .fern-cf-link {
          font-weight: 400;
          font-size: 0.875rem;
          color: var(--grayscale-11);
          text-decoration: none;
          transition: color 0.15s ease-in-out;
        }

        .fern-cf-link:hover {
          color: var(--grayscale-12);
        }

        .fern-cf-bottom-text {
          font-weight: 400;
          font-size: 0.875rem;
          color: var(--grayscale-10);
          text-decoration: none;
          transition: color 0.15s ease-in-out;
          width: fit-content;
        }

        /* Dark mode toggling */
        .fern-cf-light { display: block; }
        .fern-cf-dark { display: none; }
        :root.dark .fern-cf-light,
        .dark .fern-cf-light { display: none; }
        :root.dark .fern-cf-dark,
        .dark .fern-cf-dark { display: block; }

        /* Mobile */
        @media (max-width: 640px) {
          .fern-cf {
            padding: 2rem 1rem;
          }

          .fern-cf-top {
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 1rem;
          }

          .fern-cf-status {
            flex-direction: column;
            gap: 0.75rem;
          }

          .fern-cf-link {
            width: fit-content;
          }

          .fern-cf-links {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            align-items: flex-start;
            padding-top: 1rem;
          }

          .fern-cf-columns {
            display: grid;
            grid-template-columns: 2fr;
            gap: 2rem;
            width: 100%;
            order: 1;
          }

          .fern-cf-bottom-text {
            order: 2;
          }

          .fern-cf-socials {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .fern-cf-soc2 {
            padding: 0;
          }
        }

        /* Tablet */
        @media (max-width: 720px) and (min-width: 481px) {
          .fern-cf-columns {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }

          .fern-cf-column {
            width: calc(50% - 1rem);
            min-width: 200px;
          }
        }
      `}</style>

      <footer className="fern-cf">
        <div className="fern-cf-top">
          <a className="fern-cf-logo" href="https://buildwithfern.com">
            <span className="fern-cf-light">
              <BuiltWithFernLight className="fern-cf-logo-img" />
            </span>
            <span className="fern-cf-dark">
              <BuiltWithFernDark className="fern-cf-logo-img" />
            </span>
          </a>

          <div className="fern-cf-status">
            <FernStatusWidget />

            <a className="fern-cf-soc2" href="https://security.buildwithfern.com/">
              <Soc2Badge className="fern-cf-soc2-img" />
              <span className="fern-cf-status-text">Soc 2 Type II</span>
            </a>
          </div>
        </div>

        <div className="fern-cf-links">
          <div className="fern-cf-bottom-text">
            &copy; 2026 Fern &bull; Birch Solutions, Inc., a Postman company
          </div>

          <div className="fern-cf-columns">
            <div className="fern-cf-column">
              <h4 className="fern-cf-column-title">Documentation</h4>
              <div className="fern-cf-column-links">
                <a href="/learn/sdks/overview/introduction" className="fern-cf-link">SDKs</a>
                <a href="/learn/docs/getting-started/overview" className="fern-cf-link">Docs</a>
                <a href="/learn/docs/ai-features/ask-fern/overview" className="fern-cf-link">Ask Fern</a>
                <a href="/learn/cli-api-reference/cli-reference/overview" className="fern-cf-link">CLI Reference</a>
              </div>
            </div>

            <div className="fern-cf-column">
              <h4 className="fern-cf-column-title">API Definitions</h4>
              <div className="fern-cf-column-links">
                <a href="/learn/api-definitions/openapi/overview" className="fern-cf-link">OpenAPI</a>
                <a href="/learn/api-definitions/asyncapi/overview" className="fern-cf-link">AsyncAPI</a>
                <a href="/learn/api-definitions/openrpc/overview" className="fern-cf-link">OpenRPC</a>
                <a href="/learn/api-definitions/grpc/overview" className="fern-cf-link">gRPC</a>
              </div>
            </div>

            <div className="fern-cf-column">
              <h4 className="fern-cf-column-title">Resources</h4>
              <div className="fern-cf-column-links">
                <a href="https://buildwithfern.com/blog" className="fern-cf-link">Blog</a>
                <a href="/learn/home#get-support" className="fern-cf-link">Support</a>
                <a href="https://buildwithfern.com/pricing" className="fern-cf-link">Pricing</a>
              </div>
            </div>

            <div className="fern-cf-column">
              <h4 className="fern-cf-column-title">Company</h4>
              <div className="fern-cf-column-links">
                <a href="https://brandfetch.com/buildwithfern.com" className="fern-cf-link">Brand Kit</a>
                <a href="https://buildwithfern.com/privacy-policy" className="fern-cf-link">Privacy Policy</a>
                <a href="https://buildwithfern.com/terms-of-service" className="fern-cf-link">Terms of Service</a>
              </div>
            </div>

            <div className="fern-cf-socials">
              <a href="https://github.com/fern-api/fern" className="fern-cf-link">
                <span className="fern-cf-light"><GitHubIcon color="#62636C" className="fern-cf-social-icon" /></span>
                <span className="fern-cf-dark"><GitHubIcon color="#B2B3BD" className="fern-cf-social-icon" /></span>
              </a>
              <a href="https://x.com/buildwithfern" className="fern-cf-link">
                <span className="fern-cf-light"><XIcon color="#62636C" className="fern-cf-social-icon" /></span>
                <span className="fern-cf-dark"><XIcon color="#B2B3BD" className="fern-cf-social-icon" /></span>
              </a>
              <a href="https://www.linkedin.com/company/buildwithfern" className="fern-cf-link">
                <span className="fern-cf-light"><LinkedInIcon color="#62636C" className="fern-cf-social-icon" /></span>
                <span className="fern-cf-dark"><LinkedInIcon color="#B2B3BD" className="fern-cf-social-icon" /></span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
