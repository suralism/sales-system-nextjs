import { Button as NextUIButton, extendVariants } from "@nextui-org/react";

const CustomButton = extendVariants(NextUIButton, {
  variants: {
    color: {
      primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
      danger: "bg-gradient-to-r from-red-600 to-pink-600 text-white",
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

export default CustomButton;
