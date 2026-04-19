interface ChromeIconProps {
  className?: string;
}

export const ChromeIcon = ({ className = "w-5 h-5" }: ChromeIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 3.301A7.144 7.144 0 0 1 12 4.858c1.768 0 3.374.65 4.626 1.724l3.953-3.301C18.462 1.757 15.79 0 12 0z" />
    <path d="M23.49 12.275c0-.851-.076-1.67-.218-2.455H12v4.643h6.436a5.508 5.508 0 0 1-2.39 3.614l3.953 3.301c2.29-2.066 3.49-5.153 3.49-9.103z" />
    <path d="M5.265 14.287a7.15 7.15 0 0 1 0-4.574l-3.953-3.3A11.96 11.96 0 0 0 .51 12c0 1.936.465 3.766 1.302 5.387l3.953-3.3z" />
    <path d="M12 24c3.24 0 5.956-1.075 7.943-2.919l-3.953-3.3A7.144 7.144 0 0 1 12 19.142a7.144 7.144 0 0 1-6.735-4.642l-3.953 3.3C3.044 20.925 6.76 24 12 24z" />
  </svg>
);

export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/ghostjob-ghost-job-detecto/clbbopifmidceplphamfdfapgacgbhnd";
