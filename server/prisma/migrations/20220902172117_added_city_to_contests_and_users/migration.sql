/*
  Warnings:

  - You are about to drop the column `city` on the `Contest` table. All the data in the column will be lost.
  - Added the required column `cityId` to the `Contest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cityId` to the `User` table without a default value. This is not possible if the table is not empty.

*/

/*
 There is no default value for cityId column, so delete all records:
*/
DELETE FROM `Result`;
DELETE FROM `User`;
DELETE FROM `Contest`;

-- AlterTable
ALTER TABLE `Contest` DROP COLUMN `city`,
    ADD COLUMN `cityId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `cityId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contest` ADD CONSTRAINT `Contest_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
