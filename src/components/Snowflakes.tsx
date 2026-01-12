import React, { useMemo } from "react";

const Snowflakes = () => {
  // 生成 50 个雪花的随机属性
  const snowflakes = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 10 + 10}s`,
      animationDelay: `${Math.random() * -20}s`,
      opacity: Math.random() * 0.7 + 0.3,
      size: `${Math.random() * 4 + 4}px`,
      blur: `${Math.random() * 1}px`,
      horizontalOffset: `${Math.random() * 40 - 20}px`,
    }));
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      <style>
        {`
          @keyframes snowfall {
            0% {
              transform: translateY(-10vh) translateX(0);
            }
            100% {
              transform: translateY(110vh) translateX(var(--horizontal-offset));
            }
          }

          .snowflake {
            position: absolute;
            background-color: white;
            border-radius: 50%;
            pointer-events: none;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            filter: blur(var(--blur));
            animation: snowfall linear infinite;
          }
        `}
      </style>
      {snowflakes.map((s) => (
        <div
          key={s.id}
          className="snowflake"
          style={
            {
              left: s.left,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDuration: s.animationDuration,
              animationDelay: s.animationDelay,
              // @ts-ignore
              "--blur": s.blur,
              "--horizontal-offset": s.horizontalOffset,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default Snowflakes;
