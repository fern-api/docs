interface XDarkProps {
  width?: number;
  height?: number;
  className?: string;
}

export const XDark = ({
  width = 24,
  height = 24,
  className = ""
}: XDarkProps) => {
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
        d="M15.4458 6.57812H17.2771L13.2771 11.1805L18 17.4215H14.2892L11.3976 13.6384L8.07229 17.4215H6.24096L10.5301 12.5058L6 6.57812H9.80723L12.4337 10.048L15.4458 6.57812ZM14.7952 16.3131H15.8072L9.25301 7.61427H8.14458L14.7952 16.3131Z"
        fill="#B2B3BD"
      />
    </svg>
  );
};

export default XDark;
