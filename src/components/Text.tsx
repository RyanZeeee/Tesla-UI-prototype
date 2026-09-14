interface TextProps {
  children: React.ReactNode
}

export function Text({ children }: TextProps) {
  return <span>{children}</span>
}
