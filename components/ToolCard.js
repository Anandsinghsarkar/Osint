import Link from "next/link";

export default function ToolCard({ tool }) {
  const cost = tool.cost || 1;
  return (
    <article className="tool">
      <div className="toolIcon">⌘</div>
      <div className="toolBody">
        <h3>{tool.name}</h3>
        <p>{tool.description || "API tool"}</p>
        <div className="toolFoot">
          <span className="pill">{cost} credit{cost === 1 ? "" : "s"}</span>
          <Link className="btn smallBtn" href={"/tools/" + encodeURIComponent(tool.id)}>Open tool →</Link>
        </div>
      </div>
    </article>
  );
}
