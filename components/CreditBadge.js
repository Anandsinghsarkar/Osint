export default function CreditBadge({ credits = 0 }) {
  const value = Number(credits);
  return <span className="credit-badge">{Number.isFinite(value) ? value : 0} credits</span>;
}
