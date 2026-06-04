type Props = {
  weekTotal: number;
  monthTotal: number;
};

export default function SpendingSummaryCard({ weekTotal, monthTotal }: Props) {
  return (
    <section className="summary-card">
      <h2 className="summary-title">Spending</h2>
      <div className="summary-row">
        <div className="summary-stat">
          <span className="summary-label">This week</span>
          <span className="summary-amount">${weekTotal.toFixed(2)}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">This month</span>
          <span className="summary-amount">${monthTotal.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
