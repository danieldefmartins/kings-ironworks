// App marks for the directions chooser.
//
// The crew picks a maps app by recognising its icon, not by reading its name —
// especially the half of the floor reading the app in Portuguese or Spanish,
// where the label is translated but the icon never is. Emoji did not do that
// job: a red apple and a car are not Apple Maps and Waze.
//
// Drawn inline rather than fetched. These are the identifying marks of each
// app, used to point at that app, which is the one thing they are for — but
// they are small enough to draw and shipping them as assets would mean either
// a CDN round trip on a shop tablet or committing someone's PNG into the repo.

export function GoogleMapsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect width="24" height="24" rx="5.4" fill="#fff" />
      {/* The road and land beneath the pin, in the four brand colours. */}
      <path d="M3 17.2 9.4 6.1l2.6 2.1L6.6 19H4.2A1.2 1.2 0 0 1 3 17.8z" fill="#34A853" />
      <path d="M21 6.2v11.6A1.2 1.2 0 0 1 19.8 19h-4.3l-2.2-6.4 3-6.4z" fill="#4285F4" />
      <path d="M6.6 19h8.9l-2.2-6.4z" fill="#FBBC04" />
      {/* Pin. */}
      <path
        d="M12 3.2a4.6 4.6 0 0 0-4.6 4.6c0 3.4 4.6 8.4 4.6 8.4s4.6-5 4.6-8.4A4.6 4.6 0 0 0 12 3.2z"
        fill="#EA4335"
      />
      <circle cx="12" cy="7.8" r="1.7" fill="#A52714" />
    </svg>
  );
}

export function WazeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect width="24" height="24" rx="5.4" fill="#33CCFF" />
      {/* The Waze face: rounded head, two wheels, two eyes. */}
      <path
        d="M12 4.6c3.7 0 6.4 2.4 6.4 5.7 0 1-.2 1.7-.5 2.5-.5 1.2-1.6 2-2.9 2.4-1 .3-2 .4-3 .4H8.2c-1.5 0-2.6-.6-3.3-1.7-.2-.3-.1-.6.2-.8.7-.4 1-1 1-2v-.8c0-3.3 2.4-5.7 5.9-5.7z"
        fill="#fff"
      />
      <circle cx="9.9" cy="10.1" r="1.05" fill="#232D3B" />
      <circle cx="14.4" cy="10.1" r="1.05" fill="#232D3B" />
      <path
        d="M9.9 12.6c.5.7 1.2 1.1 2.2 1.1s1.7-.4 2.2-1.1"
        stroke="#232D3B"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="9.3" cy="17.5" r="1.6" fill="#fff" />
      <circle cx="15" cy="17.5" r="1.6" fill="#fff" />
    </svg>
  );
}

export function AppleMapsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id="kiw-am-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f5f0" />
          <stop offset="1" stopColor="#e8e4da" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5.4" fill="url(#kiw-am-sky)" />
      {/* Park, water and the road that crosses them. */}
      <path d="M0 15.4c3.3.9 6 .3 8.6-.9V24H0z" fill="#8FD08A" opacity=".85" />
      <path d="M24 4.6c-2.6 1.5-4.6 3.4-6.1 5.7H24z" fill="#7FC4E8" opacity=".8" />
      <path
        d="M2.4 3.4C7.9 8 12 12.4 14.4 21.6"
        stroke="#fff"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M2.4 3.4C7.9 8 12 12.4 14.4 21.6"
        stroke="#F2B33D"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      {/* The navigation arrow. */}
      <path d="M20.6 8.1 12.9 11.7l3.2 1.1 1.1 3.2z" fill="#2C7DF7" />
    </svg>
  );
}
