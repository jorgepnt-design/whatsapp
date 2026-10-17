export const KINDS = [
  { id:'liebe',     label:'Liebe',          hint:'Beziehung, Date, Ex-Partner',          icon:'💌', color:'var(--k1)' },
  { id:'gruppe',    label:'Freundeskreis',  hint:'Clique, Reisegruppe, Verein',          icon:'🎉', color:'var(--k2)' },
  { id:'freund',    label:'Freundschaft',   hint:'Beste Freundin, alter Kumpel',         icon:'🤝', color:'var(--k3)' },
  { id:'familie',   label:'Familie',        hint:'Eltern, Geschwister, Oma',  icon:'🏡', color:'var(--k4)' },
  { id:'arbeit',    label:'Arbeit / Team',  hint:'Kollegen, Projektchat, Chefin',        icon:'💼', color:'var(--k5)' },
  { id:'anderes',   label:'Was anderes',    hint:'WG, Nachbarn, alles andere',           icon:'🧩', color:'var(--k6)' },
];
export const kindById = id => KINDS.find(k => k.id === id) || null;
