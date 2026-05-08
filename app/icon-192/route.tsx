import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#8b1a1a",
          color: "#fafaf7",
          fontSize: 150,
          fontWeight: 700,
          lineHeight: 1,
          paddingBottom: 20,
        }}
      >
        ♪
      </div>
    ),
    { width: 192, height: 192 }
  );
}
