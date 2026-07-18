/** Teacher photo with an initials fallback (first letters of each name word). */
export function TeacherAvatar({
  name,
  photoUrl,
  size = 48,
  className = "",
}: {
  name: string;
  photoUrl?: string;
  size?: number;
  className?: string;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.36) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-saffron font-semibold text-primary ${className}`}
    >
      {initials}
    </span>
  );
}
