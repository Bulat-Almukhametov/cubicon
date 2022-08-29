/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `City` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Region` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `City_name_key` ON `City`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `Region_name_key` ON `Region`(`name`);
