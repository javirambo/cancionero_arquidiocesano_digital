import { ImageResponse } from "next/og";

// Maskable icon: el contenido seguro debe quedar en el 80% central.
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
          fontSize: 280,
          fontWeight: 700,
          lineHeight: 1,
          paddingBottom: 36,
        }}
      >
        ♪
      </div>
    ),
    { width: 512, height: 512 }
  );
}
