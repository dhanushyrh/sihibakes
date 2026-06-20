export type RazorpayCheckoutInstance = {
  open: () => void;
  on: (
    event: string,
    handler: (response: {
      error?: {
        description?: string;
        reason?: string;
      };
    }) => void
  ) => void;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
  }
}

export {};
