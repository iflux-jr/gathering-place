// The page background every screen shares: warm off-white with a few large, slowly drifting
// brand-colour shapes for the glass panels to blur. Pure CSS (see .backdrop in globals.css).
export function Backdrop() {
  return (
    <div className="backdrop print:hidden" aria-hidden="true">
      <span className="backdrop__shape backdrop__shape--orange" />
      <span className="backdrop__shape backdrop__shape--peach" />
      <span className="backdrop__shape backdrop__shape--cream" />
      <span className="backdrop__shape backdrop__shape--brown" />
    </div>
  );
}
