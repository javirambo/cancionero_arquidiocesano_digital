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
          background: "#1f3f73",
          color: "#ffffff",
          fontSize: 400,
          fontWeight: 700,
          lineHeight: 1,
          paddingBottom: 50,
        }}
      >
        ♪
      </div>
    ),
    { width: 512, height: 512 }
  );
}
