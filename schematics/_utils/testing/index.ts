import { UnitTestTree } from "@angular-devkit/schematics/testing";
import { getFileContent } from "@schematics/angular/utility/test";

export function checkIfFileExists(tree: UnitTestTree, fileName: string): void {
    expect(tree.files.indexOf(`${fileName}`)).toBeGreaterThanOrEqual(0, `Lack of ${fileName}`);
}

export function shouldContainEntry(tree: UnitTestTree, fileName: string, regex: RegExp): void {
    expect(regex.exec(getFileContent(tree, fileName))).not.toBeNull(
        `Lack of ${regex} in the ${fileName}`,
    );
}
