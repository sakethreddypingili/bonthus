import { Typography, Box, useTheme } from"@mui/material";
import { tokens } from"../theme";

const Header = ({ title, subtitle }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Box mb="30px">
      <Typography
        variant="h2"
        color={theme.palette.mode ==="dark" ? colors.grey[100] : colors.primary[500]}
        fontWeight="bold"
        sx={{ m:"0 0 5px 0" }}
      >
        {title}
      </Typography>
      <Typography 
        variant="h5" 
        color={colors.greenAccent[500]}
        sx={{ fontWeight:"500" }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
};

export default Header;
