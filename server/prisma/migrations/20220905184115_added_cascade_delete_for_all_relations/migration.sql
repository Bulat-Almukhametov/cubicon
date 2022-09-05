/*
  Warnings:

  - Made the column `organizedById` on table `Contest` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Contest` DROP FOREIGN KEY `Contest_cityId_fkey`;

-- DropForeignKey
ALTER TABLE `Contest` DROP FOREIGN KEY `Contest_organizedById_fkey`;

-- DropForeignKey
ALTER TABLE `Result` DROP FOREIGN KEY `Result_performedById_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_cityId_fkey`;

-- AlterTable
ALTER TABLE `Contest` MODIFY `organizedById` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contest` ADD CONSTRAINT `Contest_organizedById_fkey` FOREIGN KEY (`organizedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contest` ADD CONSTRAINT `Contest_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Result` ADD CONSTRAINT `Result_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
