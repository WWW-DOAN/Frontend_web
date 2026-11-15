"use client";

import MuiAvatar, { AvatarProps } from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import { getInitialsName } from "../../common/helpers/getInitName.helpers";
import GroupsIcon from "@mui/icons-material/Groups";

export const DEFAULT_AVATAR_URL =
  "https://static.vecteezy.com/system/resources/previews/026/434/409/non_2x/default-avatar-profile-icon-social-media-user-photo-vector.jpg";

interface AppAvatarProps extends Omit<AvatarProps, "src"> {
  src?: string | null;
  name: string | null;
  size?: number;
  fontSize?: number;
  isGroup?: boolean;
  memberAvatars?: string[];
}

export default function AppAvatar({
  src,
  name,
  size = 32,
  alt,
  sx,
  children,
  fontSize = 16,
  isGroup = false,
  memberAvatars,
  ...rest
}: AppAvatarProps) {
  if (isGroup && !src) {
    const validAvatars = (memberAvatars || []).filter(Boolean).slice(0, 4);

    if (validAvatars.length >= 2) {
      const count = validAvatars.length;
      return (
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: "50%",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: count === 2 ? "1fr" : "1fr 1fr",
            gap: "1px",
            backgroundColor: "#CBD5E1",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            ...sx,
          }}
        >
          {validAvatars.map((url, idx) => {
            const isSingleBottom = count === 3 && idx === 2;
            return (
              <Box
                key={idx}
                component="img"
                src={url}
                alt={alt ?? name ?? ""}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  gridColumn: isSingleBottom ? "span 2" : "auto",
                }}
              />
            );
          })}
        </Box>
      );
    }

    return (
      <MuiAvatar
        alt={alt ?? name ?? ""}
        sx={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #0068FF 0%, #00B4FF 100%)",
          fontSize: fontSize * 0.8,
          fontWeight: 500,
          ...sx,
        }}
        {...rest}
      >
        <GroupsIcon sx={{ fontSize: size * 0.5, color: "#fff" }} />
      </MuiAvatar>
    );
  }

  const finalSrc = src || DEFAULT_AVATAR_URL;

  const fallback = children || getInitialsName(name ?? "") || "A";
  return (
    <MuiAvatar
      src={finalSrc}
      alt={alt ?? name ?? ""}
      sx={{
        width: size,
        height: size,
        fontSize,
        fontWeight: 700,
        ...sx,
      }}
      {...rest}
    >
      {fallback}
    </MuiAvatar>
  );
}

export const buildS3Url = (src?: string | null) => src ?? null;
