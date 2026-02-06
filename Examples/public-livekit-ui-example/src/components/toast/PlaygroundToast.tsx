import { useToast } from "./ToasterProvider";

export type ToastType = "error" | "success" | "info";
export type ToastProps = {
  message: string;
  type: ToastType;
  onDismiss: () => void;
};

export const PlaygroundToast = () => {
  const { toastMessage, setToastMessage } = useToast();
  const color =
    toastMessage?.type === "error"
      ? "red"
      : toastMessage?.type === "success"
      ? "green"
      : "amber";

  return (
    <div
      className={`
        absolute text-sm break-words px-6 pr-14 py-4 rounded-xl top-4 left-4 right-4
        backdrop-blur-md border shadow-lg transition-all duration-300
        ${color === "red" 
          ? "bg-red-500/20 border-red-300/30 text-red-100" 
          : color === "green" 
          ? "bg-green-500/20 border-green-300/30 text-green-100"
          : "bg-amber-500/20 border-amber-300/30 text-amber-100"
        }
      `}
    >
      <button
        className={`
          absolute right-3 top-1/2 transform -translate-y-1/2
          w-8 h-8 rounded-lg transition-all duration-200
          backdrop-blur-sm border border-white/20
          hover:bg-white/10 hover:scale-110 hover:border-white/30
          active:scale-95
          ${color === "red" 
            ? "text-red-200 hover:text-red-100" 
            : color === "green" 
            ? "text-green-200 hover:text-green-100"
            : "text-amber-200 hover:text-amber-100"
          }
        `}
        onClick={() => {
          setToastMessage(null);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {toastMessage?.message}
    </div>
  );
};
