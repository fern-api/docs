interface BuiltWithFernFrameLightProps {
  width?: number;
  height?: number;
  className?: string;
}

export const BuiltWithFernFrameLight = ({
  width = 217,
  height = 120,
  className = ""
}: BuiltWithFernFrameLightProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 217 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <line
        x1="32.5"
        y1="2.18557e-08"
        x2="32.5"
        y2="120"
        stroke="url(#paint0_linear_798_27733)"
      />
      <line
        x1="177.5"
        y1="2.18557e-08"
        x2="177.5"
        y2="120"
        stroke="url(#paint1_linear_798_27733)"
      />
      <line
        x1="217"
        y1="48.5"
        y2="48.5"
        stroke="url(#paint2_linear_798_27733)"
      />
      <line
        x1="217"
        y1="80.5"
        y2="80.5"
        stroke="url(#paint3_linear_798_27733)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_798_27733"
          x1="31.5"
          y1="-3.02609e-08"
          x2="31.5"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.401095" stopColor="#E0E1E6" />
          <stop offset="0.700547" stopColor="#E0E1E6" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_798_27733"
          x1="176.5"
          y1="-3.02609e-08"
          x2="176.5"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.401095" stopColor="#E0E1E6" />
          <stop offset="0.700547" stopColor="#E0E1E6" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_798_27733"
          x1="217"
          y1="47.5"
          x2="1.52007e-08"
          y2="47.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.180986" stopColor="#E0E1E6" />
          <stop offset="0.849328" stopColor="#E0E1E6" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_798_27733"
          x1="217"
          y1="79.5"
          x2="1.52007e-08"
          y2="79.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.180986" stopColor="#E0E1E6" />
          <stop offset="0.849328" stopColor="#E0E1E6" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default BuiltWithFernFrameLight;
