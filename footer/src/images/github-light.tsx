interface GitHubLightProps {
  width?: number;
  height?: number;
  className?: string;
}

export const GitHubLight = ({
  width = 25,
  height = 24,
  className = ""
}: GitHubLightProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.27 17.8332V15.4998C14.3512 14.7691 14.1416 14.0357 13.6867 13.4582C15.4367 13.4582 17.1867 12.2915 17.1867 10.2498C17.2333 9.52067 17.0292 8.80317 16.6033 8.20817C16.7667 7.53734 16.7667 6.83734 16.6033 6.1665C16.6033 6.1665 16.02 6.1665 14.8533 7.0415C13.3133 6.74984 11.7267 6.74984 10.1867 7.0415C9.02002 6.1665 8.43668 6.1665 8.43668 6.1665C8.26168 6.83734 8.26168 7.53734 8.43668 8.20817C8.01194 8.80077 7.80579 9.5223 7.85335 10.2498C7.85335 12.2915 9.60335 13.4582 11.3533 13.4582C11.1258 13.744 10.9567 14.0707 10.8575 14.4207C10.7583 14.7707 10.7292 15.1382 10.77 15.4998V17.8332"
        stroke="#62636C"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.77 15.5002C8.13919 16.6668 7.85336 14.3335 6.68669 14.3335"
        stroke="#62636C"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default GitHubLight;
