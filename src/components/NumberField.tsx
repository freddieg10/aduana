import { useState } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  /** Undefined shows an empty field. */
  value: number | undefined;
  onChange: (n: number) => void;
  /**
   * Show 0 as an empty field, so a fresh form does not make the user delete a default 0
   * before typing. Turn it off where 0 is an answer in itself, like a 0% rate.
   */
  ceroVacio?: boolean;
};

const aTexto = (n: number | undefined, ceroVacio: boolean) =>
  n === undefined || !Number.isFinite(n) || (ceroVacio && n === 0) ? '' : String(n);

/**
 * A numeric input that keeps what the user typed. A plain `type="number"` field bound to a
 * number snaps an emptied field back to 0 on the next render, so the default 0 could not be
 * deleted. Here the text is local: emptying the field is allowed and reports 0 to the model.
 */
export default function NumberField({ value, onChange, ceroVacio = true, ...rest }: Props) {
  const [texto, setTexto] = useState(() => aTexto(value, ceroVacio));
  const [visto, setVisto] = useState(value);

  // A value changed from outside (an import, another field) replaces the text; the user's own
  // edits come back here as the same number and leave the text alone.
  if (value !== visto) {
    setVisto(value);
    if (Number(texto || 0) !== value) setTexto(aTexto(value, ceroVacio));
  }

  return (
    <TextField
      {...rest}
      type="number"
      value={texto}
      onChange={(e) => {
        const t = e.target.value;
        setTexto(t);
        const n = t.trim() === '' ? 0 : Number(t);
        if (Number.isFinite(n)) {
          setVisto(n);
          onChange(n);
        }
      }}
    />
  );
}
