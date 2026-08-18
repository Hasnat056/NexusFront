import type { CSSProperties } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  src: string | null;
  name: string;
  size?: number;
}

/** image is Person.image, proxied through the backend to Cloudinary — null for most mock
 * records here, so this falls back to initials the same way ProfileStrip/detail pages do. */
export function Avatar({ src, name, size }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span className={styles.avatar} style={size ? ({ "--avatar-size": `${size}px` } as CSSProperties) : undefined}>
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}
