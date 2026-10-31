import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page">
      <header className="page-head">
        <span className="label">Error 404</span>
        <h1 className="page-head__title">
          Off the <span className="serif-accent">grid.</span>
        </h1>
        <p className="page-head__lede">
          The page you were looking for doesn&rsquo;t exist.
        </p>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link href="/" className="btn btn--primary">
          Back to home
        </Link>
        <Link href="/sets" className="btn">
          Your sets
        </Link>
      </div>
    </div>
  );
}
