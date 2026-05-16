import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f3f73",
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1,
          paddingBottom: 4,
        }}
      >
        ♪
      </div>
    ),
    { ...size }
  );
}
