import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
};

export function PomeloLogo({ size = 32, className }: Props) {
  return (
    <Image
      src="/pomelo-logo.svg"
      alt="Pomelo"
      width={size}
      height={size}
      className={className}
    />
  );
}
