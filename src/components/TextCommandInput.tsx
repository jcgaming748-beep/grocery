type Props = {
  onSubmit: (text: string) => void;
};

export default function TextCommandInput({ onSubmit }: Props) {
  return (
    <form
      className="text-command"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem('command') as HTMLInputElement;
        const text = input.value.trim();
        if (text) {
          onSubmit(text);
          input.value = '';
        }
      }}>
      <label htmlFor="command" className="text-command-label">
        Quick add (type or use keyboard dictation)
      </label>
      <div className="text-command-row">
        <input
          id="command"
          name="command"
          type="text"
          className="input"
          placeholder='e.g. "add 2 milk at 3.49"'
          autoComplete="off"
        />
        <button type="submit" className="btn-secondary">
          Add
        </button>
      </div>
      <p className="hint">On iPhone: tap the keyboard mic to dictate, then tap Add.</p>
    </form>
  );
}
