// eslint-disable-next-line no-unused-vars
declare namespace NodeJS {
    
    import { ColorResolvable } from "discord.js";

    export interface ProcessEnv {
        DISCORD_CLIENT_TOKEN: string;

        DB_NAME: string;
        DB_HOST: string;
        DB_USERNAME: string;
        DB_PASSWORD: string;

        EMBED_COLOR: ColorResolvable;

        COMMAND_PREFIX: string;

        GUILD_ID: string|undefined;

        SPREADSHEET_ID: string|undefined;

        ENVIRONMENT: string;

        OWNER_ID: string;
        IMAGE_CONVERTER_CHANNEL_ID: string;
        API_PORT: string;
    }
}