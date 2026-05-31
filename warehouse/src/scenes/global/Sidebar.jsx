import { useState } from"react";
import { ProSidebar, Menu, MenuItem } from"react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from"@mui/material";
import { Link } from"react-router-dom";
import"react-pro-sidebar/dist/css/styles.css";
import { tokens } from"../../theme";
import HomeOutlinedIcon from"@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from"@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from"@mui/icons-material/ContactsOutlined";
import ReceiptOutlinedIcon from"@mui/icons-material/ReceiptOutlined";
import PersonOutlinedIcon from"@mui/icons-material/PersonOutlined";
import CalendarTodayOutlinedIcon from"@mui/icons-material/CalendarTodayOutlined";
import HelpOutlineOutlinedIcon from"@mui/icons-material/HelpOutlineOutlined";
import BarChartOutlinedIcon from"@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from"@mui/icons-material/PieChartOutlineOutlined";
import TimelineOutlinedIcon from"@mui/icons-material/TimelineOutlined";
import MenuOutlinedIcon from"@mui/icons-material/MenuOutlined";
import MapOutlinedIcon from"@mui/icons-material/MapOutlined";

const Item = ({ title, to, icon, selected, setSelected }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={selected === title}
      style={{
        color: selected === title ? colors.redAccent[500] : colors.grey[200],
        backgroundColor:
          selected === title ?"rgba(255, 94, 0, 0.08)" :"transparent",
      }}
      onClick={() => setSelected(title)}
      icon={icon}
    >
      <Typography>{title}</Typography>
      <Link to={to} />
    </MenuItem>
  );
};

const Sidebar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");

  return (
    <Box
      sx={{
"& .pro-sidebar-inner": {
          background: `#ffffff !important`,
          boxShadow:"2px 0 8px rgba(0,0,0,0.08)",
        },
"& .pro-icon-wrapper": {
          backgroundColor:"transparent !important",
        },
"& .pro-inner-item": {
          padding:"8px 35px 8px 20px !important",
          borderRadius:"8px !important",
          margin:"4px 0 !important",
          transition:"all 0.3s ease !important",
          color: `${colors.grey[200]} !important`,
        },
"& .pro-inner-item:hover": {
          color: `${colors.greenAccent[500]} !important`,
          backgroundColor:"rgba(0, 186, 198, 0.1) !important",
        },
"& .pro-menu-item.active": {
          color: `${colors.redAccent[500]} !important`,
          backgroundColor:"rgba(255, 94, 0, 0.1) !important",
        },
"& .pro-menu-item": {
          borderRadius:"8px !important",
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">
          {/* LOGO AND MENU ICON */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin:"10px 0 20px 0",
              color: colors.primary[500],
            }}
          >
            {!isCollapsed && (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                ml="15px"
              >
                <Typography
                  variant="h3"
                  color={colors.primary[500]}
                  sx={{ fontWeight:"700" }}
                >
                  ADMIN
                </Typography>
                <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
                  <MenuOutlinedIcon />
                </IconButton>
              </Box>
            )}
          </MenuItem>



          <Box paddingLeft={isCollapsed ? undefined :"10%"}>
            <Item
              title="Dashboard"
              to="/"
              icon={<HomeOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            <Typography
              variant="h6"
              color={colors.primary[500]}
              sx={{
                m:"15px 0 5px 20px",
                fontWeight:"600",
                letterSpacing:"0.5px",
              }}
            >
              Data
            </Typography>
            <Item
              title="Manage Team"
              to="/team"
              icon={<PeopleOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Contacts Information"
              to="/contacts"
              icon={<ContactsOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Invoices Balances"
              to="/invoices"
              icon={<ReceiptOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            <Typography
              variant="h6"
              color={colors.primary[500]}
              sx={{
                m:"15px 0 5px 20px",
                fontWeight:"600",
                letterSpacing:"0.5px",
              }}
            >
              Pages
            </Typography>
            <Item
              title="Profile Form"
              to="/form"
              icon={<PersonOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Calendar"
              to="/calendar"
              icon={<CalendarTodayOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="FAQ Page"
              to="/faq"
              icon={<HelpOutlineOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />

            <Typography
              variant="h6"
              color={colors.primary[500]}
              sx={{
                m:"15px 0 5px 20px",
                fontWeight:"600",
                letterSpacing:"0.5px",
              }}
            >
              Charts
            </Typography>
            <Item
              title="Bar Chart"
              to="/bar"
              icon={<BarChartOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Pie Chart"
              to="/pie"
              icon={<PieChartOutlineOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Line Chart"
              to="/line"
              icon={<TimelineOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
            <Item
              title="Geography Chart"
              to="/geography"
              icon={<MapOutlinedIcon />}
              selected={selected}
              setSelected={setSelected}
            />
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
