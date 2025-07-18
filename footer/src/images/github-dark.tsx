interface GitHubDarkProps {
  width?: number;
  height?: number;
  className?: string;
}

export const GitHubDark = ({
  width = 24,
  height = 24,
  className = ""
}: GitHubDarkProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13.75 17.8332V15.4998C13.8311 14.7691 13.6216 14.0357 13.1667 13.4582C14.9167 13.4582 16.6667 12.2915 16.6667 10.2498C16.7133 9.52067 16.5092 8.80317 16.0833 8.20817C16.2467 7.53734 16.2467 6.83734 16.0833 6.1665C16.0833 6.1665 15.5 6.1665 14.3333 7.0415C12.7933 6.74984 11.2067 6.74984 9.66666 7.0415C8.5 6.1665 7.91666 6.1665 7.91666 6.1665C7.74166 6.83734 7.74166 7.53734 7.91666 8.20817C7.49192 8.80077 7.28577 9.5223 7.33333 10.2498C7.33333 12.2915 9.08333 13.4582 10.8333 13.4582C10.6058 13.744 10.4367 14.0707 10.3375 14.4207C10.2383 14.7707 10.2092 15.1382 10.25 15.4998V17.8332"
        stroke="#B2B3BD"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 15.5002C7.61917 16.6668 7.33334 14.3335 6.16667 14.3335"
        stroke="#B2B3BD"
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default GitHubDark;
