import React from "react";
import { useUser } from "../../hooks/useUser";
import { useGuilds } from "../../hooks/useGuilds";
import { H2, H3, BodyText, SmallText, UnorderedList, ListItem, Hr, InlineCode } from "../../components/Typography";

const DiscordAvatar: React.FC<{ uid: string; name: string }> = ({ uid, name }) => {
    return (
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-300 flex items-center justify-center text-2xl font-bold text-slate-600 shrink-0">
                {name.charAt(0).toUpperCase()}
            </div>
            <div>
                <BodyText className="mb-0 text-lg font-semibold">{name}</BodyText>
                <SmallText>Discord ID: {uid}</SmallText>
            </div>
        </div>
    );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-baseline gap-2 py-1">
        <span className="text-slate-500 text-sm w-28 shrink-0">{label}</span>
        <BodyText className="mb-0">{value}</BodyText>
    </div>
);

const ProfilePage = () => {
    const { data: user } = useUser();
    const { data: guildsData } = useGuilds();

    const createdDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }) : "";

    const adminGuilds = guildsData?.guilds?.filter((g) => g.isAdmin) || [];
    const memberGuilds = guildsData?.guilds?.filter((g) => !g.isAdmin) || [];

    return (
        <div className="space-y-6">
            <H2>Profile</H2>

            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
                <H3 className="mt-0 mb-4">Account</H3>
                <DiscordAvatar uid={user?.uid || ""} name={user?.name || ""} />

                <Hr className="my-4" />

                <div className="space-y-1">
                    <InfoRow label="Email" value={user?.email || "Not set"} />
                    <InfoRow label="User ID" value={String(user?.id || "-")} />
                    <InfoRow label="Joined" value={createdDate || "Unknown"} />
                    <InfoRow label="Login Method" value={user?.loginType || "None"} />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
                <H3 className="mt-0 mb-4">
                    Mutual Servers
                    <span className="ml-2 text-base font-normal text-slate-500">
                        ({guildsData?.guilds?.length || 0} total)
                    </span>
                </H3>

                {adminGuilds.length > 0 && (
                    <div className="mb-4">
                        <SmallText className="block mb-1 font-semibold text-slate-600 uppercase tracking-wide">
                            Admin ({adminGuilds.length})
                        </SmallText>
                        <UnorderedList className="mb-0">
                            {adminGuilds.map((g) => (
                                <ListItem key={g.guildId}>
                                    {g.name}
                                    <InlineCode className="ml-2 text-xs">Admin</InlineCode>
                                </ListItem>
                            ))}
                        </UnorderedList>
                    </div>
                )}

                {memberGuilds.length > 0 && (
                    <div>
                        <SmallText className="block mb-1 font-semibold text-slate-600 uppercase tracking-wide">
                            Member ({memberGuilds.length})
                        </SmallText>
                        <UnorderedList className="mb-0">
                            {memberGuilds.map((g) => (
                                <ListItem key={g.guildId}>{g.name}</ListItem>
                            ))}
                        </UnorderedList>
                    </div>
                )}

                {(!guildsData?.guilds || guildsData.guilds.length === 0) && (
                    <BodyText className="text-slate-400 italic">No mutual servers found.</BodyText>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
