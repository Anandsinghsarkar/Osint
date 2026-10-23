export default function ToolCard({ name, description, children }) {
  return <article className="tool-card"><h3>{name}</h3><p className="muted">{description}</p>{children}</article>;
}
