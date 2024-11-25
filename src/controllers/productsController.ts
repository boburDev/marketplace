import { Request, Response } from 'express';
import { uploadPhoto } from '../middlewares/multer';
import multer from 'multer';
import ProductModel, { ProductPictureModel } from '../models/products';
import Category from '../models/category';
import SubCategory from '../models/sub-category';
import mongoose from 'mongoose';
import User from '../types/user';
import { verify } from '../utils/jwt';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const catalog = await Category.findOne({ route: `/${req.params.name}` });
        if (!catalog) throw new Error("Category not found");
        const subCategory = await SubCategory.find({ categoryId: catalog._id });

        const token = req.headers.authorization?.split(' ')[1];
        let decoded: User | null = verify(String(token));
        
        let isAdmin: any = decoded ? decoded.isLegal : false

        if (subCategory.length) {

            const subCategoryArray = subCategory.map((id) => new mongoose.Types.ObjectId(id.id))

            const products = await ProductModel.aggregate([
                {
                    $match: {
                        subCategoryId: { $in: subCategoryArray },
                    },
                },
                {
                    $lookup: {
                        from: "subcategories",
                        localField: "subCategoryId",
                        foreignField: "_id",
                        as: "subCategory",
                    },
                },
                {
                    $unwind: "$subCategory",
                },
                {
                    $addFields: {
                        sortIndex: {
                            $indexOfArray: [subCategoryArray, "$subCategoryId"],
                        },
                    },
                },
                {
                    $sort: {
                        sortIndex: 1,
                    },
                },
                {
                    $group: {
                        _id: "$subCategory.name",
                        products: {
                            $push: {
                                path: "$path",
                                definition: "$definition",
                                subCategoryId: "$subCategoryId",
                                productId: "$_id",
                                ...(isAdmin && { price: "$price" }),
                            },
                        },
                    },
                },
            ]);
            
            const formattedProducts: Record<string, any[]> = {};
            products.forEach((category) => {
                formattedProducts[category._id] = category.products;
            });

            res.status(201).json({ products: formattedProducts });
        } else {
            res.status(201).json({ products: subCategory });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

const uploadPhotos = uploadPhoto.array('photos', 5);

export const getSingleProduct = async (req: Request, res: Response) => {
    try {
    const { id } = req.body; // Get product ID from request parameters

    // Find the product by its ID and populate related subcategory details
    const product = await ProductModel.findById(id)
      .populate({
        path: "subCategoryId",
        select: "name order", // Select only the fields you want from SubCategory
        model: SubCategoryModel,
      })
      .exec();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find all pictures associated with the product
    const pictures = await ProductPictureModel.find({ productId: id }).select("path");

    // Prepare the response
    const response = {
      id: product._id,
      name: product.name,
      definition: product.definition,
      price: product.price,
      rate: product.rate,
      count: product.count,
      sale: product.sale,
      hashtag: product.hashtag,
      path: product.path,
      subCategory: product.subCategoryId, // Populated subcategory details
      pictures, // List of associated product pictures
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Error fetching product", error });
  }
}

export const createProduct = async (req: Request, res: Response) => {
    try {
        uploadPhotos(req, res, async (err)=>{
            if (err instanceof multer.MulterError) {
                res.status(400).json({ error: err.message });
                return
            } else if (err) {
                res.status(400).json({ error: err.message });
                return
            }

            if (!req.files) {
                res.status(400).json({ error: 'No files were uploaded.' });
                return
            }
            const files: any = req.files
            
            const newProduct = new ProductModel({
                name: req.body.name,
                definition: req.body.definition,
                path: files.length ? (files[0].destination.split('./')[1] + '/' + files[0].filename) : '',
                price: req.body.price,
                rate: req.body.rate,
                sale: req.body.sale || 0,
                hashtag: req.body.hashtag || [],
                subCategoryId: req.body.subCategoryId,
            });

            const product = await newProduct.save();
            
            for (const i of files) {
                const newPicture = new ProductPictureModel({
                    productId: product._id,
                    path: i.destination.split('./')[1] + '/' + i.filename,
                });

                await newPicture.save();
            }
           
            res.status(200).json({
                message: 'Product created successfully',
                product,
            });
        })
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error });
    }
};
