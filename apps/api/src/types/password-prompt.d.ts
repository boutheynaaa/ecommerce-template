
declare module "password-prompt" {
  function promptPassword(
    prompt: string,
    options?: {
      method?: string;
      sigint?: boolean;
    },
  ): Promise<string>;

  export default promptPassword;
}
