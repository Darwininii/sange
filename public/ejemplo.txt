// import { IoCheckmark } from "react-icons/io5";
import { ImRadioChecked } from "react-icons/im";

interface CustomCheckboxProps {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    className?: string;
}

export const CustomCheckbox = ({
    id,
    checked,
    onChange,
    label,
    className = "",
}: CustomCheckboxProps) => {
    return (
        <label
            className={`relative inline-flex items-center group cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 p-2 rounded-lg transition-all ${className}`}
        >
            <input
                type="checkbox"
                id={id}
                className="sr-only peer"
                checked={checked}
                onChange={() => onChange(!checked)}
            />
            {/* Custom Checkbox */}
            <div className="relative w-5 h-5 bg-white dark:bg-gray-800 border-2 border-black/70 dark:border-white/70 rounded-md transition-all duration-300 peer-checked:bg-linear-to-br peer-checked:from-rose-500 peer-checked:to-rose-600 dark:peer-checked:from-rose-600 dark:peer-checked:to-rose-700 peer-checked:border-rose-500 dark:peer-checked:border-rose-600 peer-focus:ring-2 peer-focus:ring-rose-500/20 dark:peer-focus:ring-rose-400/20 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-900 flex items-center justify-center">
                {/* Checkmark - shown when checked */}
                {checked && (
                    <ImRadioChecked size={20} className="text-white transition-transform duration-200 scale-102" />
                )}
            </div>
            <span className="ml-3 text-black dark:text-white/70 group-hover:text-rose-600 dark:group-hover:text-rose-400 font-bold text-sm transition-colors select-none peer-checked:text-rose-600 dark:peer-checked:text-rose-400 peer-checked:font-semibold">
                {label}
            </span>
        </label>
    );
};
