import { Box, IconButton, useTheme, Typography } from "@mui/material";
import InputBase from "@mui/material/InputBase";
import { tokens } from "../../theme";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import SearchIcon from "@mui/icons-material/Search";

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box>
      {/* TOP NAVIGATION BAR */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        backgroundColor={colors.primary[500]}
        boxShadow="0 2px 8px rgba(0,0,0,0.12)"
      >
        {/* LOGO & BRAND */}
        <Box display="flex" alignItems="center" gap={3}>
          <Typography
            variant="h3"
            sx={{
              color: "#ffffff",
              fontWeight: "700",
              letterSpacing: "1px",
            }}
          >
            ADMIN
          </Typography>

          {/* NAVIGATION LINKS */}
          <Box display="flex" gap={3} sx={{ display: { xs: "none", sm: "flex" } }}>
            <Typography
              sx={{
                color: "#ffffff",
                cursor: "pointer",
                "&:hover": { color: colors.greenAccent[500] },
              }}
            >
              Dashboard
            </Typography>
            <Typography
              sx={{
                color: "#ffffff",
                cursor: "pointer",
                "&:hover": { color: colors.greenAccent[500] },
              }}
            >
              Reports
            </Typography>
            <Typography
              sx={{
                color: "#ffffff",
                cursor: "pointer",
                "&:hover": { color: colors.greenAccent[500] },
              }}
            >
              Users
            </Typography>
          </Box>
        </Box>

        {/* CENTER - SEARCH BAR */}
        <Box
          display="flex"
          backgroundColor="#ffffff"
          borderRadius="25px"
          border={`1px solid ${colors.grey[700]}`}
          sx={{ flex: 0.3 }}
          boxShadow="0 2px 4px rgba(0,0,0,0.05)"
        >
          <InputBase
            sx={{
              ml: 2,
              flex: 1,
              color: colors.grey[200],
              "& ::placeholder": {
                color: colors.grey[600],
                opacity: 1,
              },
            }}
            placeholder="What are you looking for?"
          />
          <IconButton
            type="button"
            sx={{
              p: 1,
              color: colors.greenAccent[500],
            }}
          >
            <SearchIcon />
          </IconButton>
        </Box>

        {/* RIGHT SIDE - ICONS */}
        <Box display="flex" gap={2} alignItems="center">
          <IconButton sx={{ color: "#ffffff", "&:hover": { color: colors.greenAccent[500] } }}>
            <NotificationsOutlinedIcon />
          </IconButton>
          <IconButton sx={{ color: "#ffffff", "&:hover": { color: colors.greenAccent[500] } }}>
            <FavoriteBorderOutlinedIcon />
          </IconButton>
          <IconButton sx={{ color: "#ffffff", "&:hover": { color: colors.greenAccent[500] } }}>
            <ShoppingCartOutlinedIcon />
          </IconButton>
          <IconButton sx={{ color: "#ffffff", "&:hover": { color: colors.greenAccent[500] } }}>
            <PersonOutlinedIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default Topbar;
