export interface Schema {
    directory?: string;
    name: string;
    skipInstall?: boolean;
    linkCli?: boolean;
    skipGit?: boolean;
    commit?: { name: string, email: string, message?: string } | boolean;
    newProjectRoot?: string;
    version?: string;
    inlineStyle?: boolean;
    inlineTemplate?: boolean;
    viewEncapsulation?: ('Emulated' | 'Native' | 'None');
    routing?: boolean;
    prefix?: string;
    style?: string;
    skipTests?: boolean;
    provider: ('both' | 'aws' | 'gcloud');
    gaTrackingCode?: string;
    firebug: boolean;
}