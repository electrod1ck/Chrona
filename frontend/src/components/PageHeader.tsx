type Props = {
  eyebrow?: string;
  title: string;
  lead?: string;
};

export function PageHeader({ eyebrow, title, lead }: Props) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
      <h1 className="page-header__title">{title}</h1>
      {lead ? <p className="page-header__lead">{lead}</p> : null}
    </header>
  );
}
