import { InputAdornment, TextField, TextFieldProps } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

type SearchFieldProps = Omit<TextFieldProps, 'size'> & {
  minWidth?: number;
};

export function SearchField({ minWidth = 280, ...props }: SearchFieldProps) {
  return (
    <TextField
      size="small"
      {...props}
      sx={{ minWidth, ...props.sx }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        ...props.InputProps,
      }}
    />
  );
}
