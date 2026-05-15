import * as Sentry from "@sentry/react";

const SentryErrorBoundary = ({ children }) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Kuch galat ho gaya</h2>
          <p>Humari team ko notify kar diya gaya hai. Dobara try karein.</p>
          <button onClick={resetError}>Dobara Try Karein</button>
        </div>
      )}
      onError={(error, componentStack) => {
        console.error("Error Boundary caught:", error);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

export default SentryErrorBoundary;