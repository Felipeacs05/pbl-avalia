import Image from "next/image";

type AvaliaLogoSize = "md" | "lg";

interface AvaliaLogoProps {
  size?: AvaliaLogoSize;
  className?: string;
}

const SIZE_STYLES: Record<
  AvaliaLogoSize,
  { wrapper: string; image: string; width: number; height: number }
> = {
  md: {
    wrapper: "w-40 h-[60px] sm:w-44 sm:h-16",
    image: "w-40 sm:w-44 h-auto",
    width: 176,
    height: 176,
  },
  lg: {
    wrapper: "w-44 h-16 sm:w-52 sm:h-[76px]",
    image: "w-44 sm:w-52 h-auto",
    width: 208,
    height: 208,
  },
};

export function AvaliaLogo({ size = "md", className = "" }: AvaliaLogoProps) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${styles.wrapper} ${className}`.trim()}
    >
      <Image
        src="/logo_avalia.png"
        alt="Logo Avalia"
        width={styles.width}
        height={styles.height}
        priority
        className={`${styles.image} shrink-0 object-contain translate-x-[3.4%] translate-y-[2.7%]`}
      />
    </div>
  );
}
