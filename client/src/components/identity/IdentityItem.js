import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  ListItem,
  Divider,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  IconButton,
  Avatar,
} from "@material-ui/core";
import LockIcon from "@material-ui/icons/Lock";
import InfoIcon from "@material-ui/icons/Info";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    maxWidth: 752,
  },
  background: {
    backgroundColor: theme.palette.background.paper,
  },
  title: {
    margin: theme.spacing(4, 0, 2),
  },
}));

const IdentityItem = ({ onActionClick, identity, setSelectedIdentity }) => {
  const classes = useStyles();

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar>
          <LockIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText primary={identity.title} />
      <ListItemSecondaryAction>
        <IconButton
          onClick={(e) => {
            setSelectedIdentity(identity);
            onActionClick(e.currentTarget);
          }}
          edge="end"
          aria-label="delete">
          <InfoIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export default IdentityItem;
