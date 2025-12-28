import { ArrowLeftRightIcon, HeartIcon, Share2Icon } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";

const products = [
  {
    id: 1,
    name: "Syltherine",
    description: "Stylish cafe chair",
    price: "Rp 2.500.000",
    originalPrice: "Rp 3.500.000",
    image: "/img/images-20.png",
    discount: "-30%",
    badgeType: "discount",
  },
  {
    id: 2,
    name: "Leviosa",
    description: "Stylish cafe chair",
    price: "Rp 2.500.000",
    originalPrice: null,
    image: "/img/images-21.png",
    discount: null,
    badgeType: null,
  },
  {
    id: 3,
    name: "Lolito",
    description: "Luxury big sofa",
    price: "Rp 7.000.000",
    originalPrice: "Rp 14.000.000",
    image: "/img/images-22.png",
    discount: "-50%",
    badgeType: "discount",
  },
  {
    id: 4,
    name: "Respira",
    description: "Outdoor bar table and stool",
    price: "Rp 500.000",
    originalPrice: null,
    image: "/img/images-23.png",
    discount: null,
    badgeType: "new",
  },
];

const allProducts = [...products, ...products, ...products, ...products];

const paginationItems = [
  { page: "1", active: true },
  { page: "2", active: false },
  { page: "3", active: false },
  { page: "Next", active: false, isNext: true },
];

export const ProductGridSection = (): JSX.Element => {
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  return (
    <section className="w-full bg-white py-4">
      <div className="container mx-auto px-[99px]">
        <div className="flex flex-col items-center gap-10">
          <div className="grid grid-cols-4 gap-8 w-full">
            {allProducts.map((product, index) => (
              <Link
                key={`product-${index}`}
                to="/single-product"
                className="block"
                onMouseEnter={() => setHoveredProduct(index)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <Card className="relative overflow-hidden border-0 shadow-none group">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        className="w-full h-[301px] object-cover"
                        alt={product.name}
                        src={product.image}
                      />

                      {product.badgeType && (
                        <div className="absolute top-6 right-6">
                          {product.badgeType === "discount" && (
                            <Badge className="h-12 w-12 rounded-full bg-color-red-accents hover:bg-color-red-accents text-color-white flex items-center justify-center [font-family:'Poppins',Helvetica] font-medium text-base">
                              {product.discount}
                            </Badge>
                          )}
                          {product.badgeType === "new" && (
                            <Badge className="h-12 w-12 rounded-full bg-color-green-accents hover:bg-color-green-accents text-color-white flex items-center justify-center [font-family:'Poppins',Helvetica] font-medium text-base">
                              New
                            </Badge>
                          )}
                        </div>
                      )}

                      {hoveredProduct === index && (
                        <div className="absolute inset-0 bg-color-gray-1 bg-opacity-72 flex flex-col items-center justify-center gap-6 z-10">
                          <Link to="/cart">
                            <Button className="bg-color-white hover:bg-color-white text-app-primary h-12 px-14 [font-family:'Poppins',Helvetica] font-semibold text-base">
                              Add to cart
                            </Button>
                          </Link>

                          <div className="flex items-center gap-5">
                            <button className="flex items-center gap-0.5 text-color-white [font-family:'Poppins',Helvetica] font-semibold text-base">
                              <Share2Icon className="w-4 h-4" />
                              <span>Share</span>
                            </button>

                            <Link
                              to="/product-comparison"
                              className="flex items-center gap-0.5 text-color-white [font-family:'Poppins',Helvetica] font-semibold text-base"
                            >
                              <ArrowLeftRightIcon className="w-4 h-4" />
                              <span>Compare</span>
                            </Link>

                            <button className="flex items-center gap-0.5 text-color-white [font-family:'Poppins',Helvetica] font-semibold text-base">
                              <HeartIcon className="w-4 h-4" />
                              <span>Like</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-color-light-bg p-4">
                      <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-color-gray-1 text-2xl leading-[28.8px] mb-2">
                        {product.name}
                      </h3>

                      <p className="[font-family:'Poppins',Helvetica] font-medium text-color-gray-3 text-base leading-6 mb-2">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-4">
                        <span className="[font-family:'Poppins',Helvetica] font-semibold text-color-gray-1 text-xl leading-[30px]">
                          {product.price}
                        </span>
                        {product.originalPrice && (
                          <span className="[font-family:'Poppins',Helvetica] font-normal text-color-gray-4 text-base leading-6 line-through">
                            {product.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <nav className="flex items-center gap-[38px] pt-[30px]">
            {paginationItems.map((item, index) => (
              <Button
                key={`pagination-${index}`}
                variant="ghost"
                className={`h-[60px] ${
                  item.isNext ? "w-[98px]" : "w-[60px]"
                } rounded-[10px] p-0 hover:bg-app-primary hover:text-white ${
                  item.active
                    ? "bg-app-primary text-white"
                    : "bg-[#f9f1e7] text-black"
                } [font-family:'Poppins',Helvetica] ${
                  item.isNext ? "font-light" : "font-normal"
                } text-xl`}
              >
                {item.page}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
};
