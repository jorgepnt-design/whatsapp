export const nf = new Intl.NumberFormat('de-DE');
export const nf1 = new Intl.NumberFormat('de-DE',{maximumFractionDigits:1});
export const pct = x => Math.round(x*100)+' %';
export const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
export const fmtDate = t => new Date(t).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'});
export function fmtDur(ms){
  if (ms==null) return '–';
  const min = ms/60e3;
  if (min<1) return 'unter 1 Min';
  if (min<60) return Math.round(min)+' Min';
  const h = min/60;
  if (h<24) return nf1.format(h)+' Std';
  return nf1.format(h/24)+' Tage';
}
export const pColor = i => `var(--p${i%6})`;
