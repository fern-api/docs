interface XLightProps {
  width?: number;
  height?: number;
  className?: string;
}

export const XLight = ({
  width = 25,
  height = 24,
  className = ""
}: XLightProps) => {
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
        d="M15.9658 6.57812H17.7971L13.7971 11.1805L18.52 17.4215H14.8092L11.9176 13.6384L8.59231 17.4215H6.76098L11.0501 12.5058L6.52002 6.57812H10.3272L12.9538 10.048L15.9658 6.57812ZM15.3152 16.3131H16.3272L9.77303 7.61427H8.6646L15.3152 16.3131Z"
        fill="#62636C"
      />
    </svg>
  );
};

export default XLight;
