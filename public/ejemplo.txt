import React, {
    useRef,
    useState,
    type InputHTMLAttributes,
    forwardRef,
} from "react";
import { cn } from "../../lib/utils"; // Asegúrate de tener esta utilidad o usa un join simple

interface CustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
    containerClassName?: string;
    wrapperClassName?: string;
}

export const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
    ({ className, containerClassName, wrapperClassName, label, error, icon, rightElement, ...props }, ref) => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        const [mouse, setMouse] = useState({ x: 0, y: 0 });
        const [isFocused, setIsFocused] = useState(false);

        const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setMouse({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        };

        return (
            <div className={cn("flex flex-col gap-1.5", containerClassName)}>
                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    className="group relative rounded-xl p-px overflow-hidden transition-all duration-300"
                    style={
                        {
                            background: `radial-gradient(120px circle at ${mouse.x}px ${mouse.y}px, rgba(168, 114, 87, 0.4), transparent 40%)`,
                        } as React.CSSProperties
                    }
                >
                    {/* Fondo y Borde con efecto */}
                    <div className="absolute inset-0 bg-linear-to-r from-neutral-200 to-neutral-100 dark:from-stone-800 dark:to-stone-900 opacity-90 rounded-xl pointer-events-none" />

                    <div
                        className={cn(
                            "relative z-10 flex items-center bg-white dark:bg-black rounded-[11px] px-3 py-1 transition-all duration-300 border border-transparent",
                            isFocused
                                ? "border-primary/50 shadow-[0_0_15px_rgba(192,144,116,0.15)]"
                                : "border-neutral-200 dark:border-stone-800 hover:border-primary/30",
                            wrapperClassName
                        )}
                    >
                        {/* Icono opcional */}
                        {icon && (
                            <div className="text-neutral-400 dark:text-neutral-500 mr-2">
                                {icon}
                            </div>
                        )}

                        <div className="relative w-full">
                            {(() => {
                                const hasRealPlaceholder = props.placeholder && props.placeholder.trim().length > 0;
                                
                                return (
                                    <>
                                        <input
                                            id={props.id || props.name}
                                            ref={ref}
                                            {...props}
                                            placeholder={props.placeholder || " "}
                                            onFocus={(e) => {
                                                setIsFocused(true);
                                                props.onFocus?.(e);
                                            }}
                                            onBlur={(e) => {
                                                setIsFocused(false);
                                                props.onBlur?.(e);
                                            }}
                                            className={cn(
                                                "peer w-full bg-transparent border-none outline-none text-sm text-neutral-900 dark:text-neutral-100 py-2.5 h-10",
                                                // If real placeholder, make it visible. Else hide it until focus.
                                                hasRealPlaceholder 
                                                    ? "placeholder:text-neutral-400" 
                                                    : "placeholder:text-transparent focus:placeholder:text-zinc-400",
                                                className
                                            )}
                                        />

                                        {/* Etiqueta flotante */}
                                        {label && (
                                            <label
                                                htmlFor={props.id || props.name}
                                                className={cn(
                                                    "absolute left-0 pointer-events-none transition-all duration-200 font-medium truncate max-w-full z-10",
                                                    // Base state (Top / Active)
                                                    "-top-1 text-[10px] text-primary",
                                                    
                                                    // Only move down if NO real placeholder exists and field is empty
                                                    !hasRealPlaceholder && "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-400",
                                                    
                                                    // Check focus behavior
                                                    "peer-focus:-top-1 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-primary"
                                                )}
                                            >
                                                {label}
                                            </label>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Right Element (e.g. Toggle Password) */}
                        {rightElement && (
                            <div className="ml-2">
                                {rightElement}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mensaje de error */}
                {error && (
                    <span className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-top-1 fade-in">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

CustomInput.displayName = "CustomInput";
