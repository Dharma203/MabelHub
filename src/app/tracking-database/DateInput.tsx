const DateInput = () => (
    <input
        type="date"
        data-testid="date-input"
        onClick={(e) => {
            if ('showPicker' in HTMLInputElement.prototype) {
                e.currentTarget.showPicker();
            }
        }}
    />
);

export default DateInput;