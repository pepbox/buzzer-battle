import React from "react";
import Button from "@mui/material/Button";

interface GlobalButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
  sx?: object;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const GlobalButton: React.FC<GlobalButtonProps> = ({
  onClick,
  disabled,
  onKeyDown,
  children,
  fullWidth = true,
  sx = {},
}) => {
  return (
    <Button
      variant="contained"
      type="submit"
      fullWidth={fullWidth}
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled}
      color={"secondary"}
      sx={{
        bgcolor: !disabled ? "secondary.main" : "rgba(142, 142, 147, 1)",
        color: "#FFFFFF !important",
        ...sx,
      }}
    >
      {children}
    </Button>
  );
};

export default GlobalButton;
