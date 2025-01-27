import React from 'react'
import {
  Box,
  VStack,
  Text,
  Button,
  useColorModeValue,
  SimpleGrid,
  Badge,
  HStack,
  Heading,
  Wrap,
  WrapItem,
  IconButton,
  useToast,
} from '@chakra-ui/react'
import { FaTrash } from 'react-icons/fa'

export interface TrainingData {
  bodyPart: string
  rating: number
  date: string
  id?: string // Add ID for deletion
}

interface TrainingLogProps {
  onSelectBodyPart: (part: string, rating: number) => void
  selectedParts: TrainingData[]
  isCurrentUser: boolean
  onDeleteTraining?: (trainingId: string) => Promise<void> // Add delete handler
}

const trainingOptions = [
  // Strength Training
  { id: 'chest', label: 'Chest', category: 'Strength' },
  { id: 'shoulders', label: 'Shoulders', category: 'Strength' },
  { id: 'biceps', label: 'Biceps', category: 'Strength' },
  { id: 'triceps', label: 'Triceps', category: 'Strength' },
  { id: 'abs', label: 'Abs', category: 'Strength' },
  { id: 'back', label: 'Back', category: 'Strength' },
  { id: 'legs', label: 'Legs', category: 'Strength' },
  { id: 'calves', label: 'Calves', category: 'Strength' },
  // Cardio
  { id: 'running', label: 'Running', category: 'Cardio' },
  { id: 'cycling', label: 'Cycling', category: 'Cardio' },
  { id: 'swimming', label: 'Swimming', category: 'Cardio' },
  { id: 'hiit', label: 'HIIT', category: 'Cardio' },
  // Flexibility
  { id: 'yoga', label: 'Yoga', category: 'Flexibility' },
  { id: 'stretching', label: 'Stretching', category: 'Flexibility' },
]

const TrainingLog = ({ onSelectBodyPart, selectedParts, isCurrentUser, onDeleteTraining }: TrainingLogProps) => {
  const [selectedTrainings, setSelectedTrainings] = React.useState<string[]>([])
  const [rating, setRating] = React.useState('5')
  const [isDeleting, setIsDeleting] = React.useState(false)
  const bgColor = useColorModeValue('white', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.800', 'white')
  const buttonBgColor = useColorModeValue('gray.50', 'gray.600')
  const selectedBgColor = useColorModeValue('purple.100', 'purple.700')
  const toast = useToast()

  const handleToggleTraining = (trainingId: string) => {
    setSelectedTrainings(prev => 
      prev.includes(trainingId)
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    )
  }

  const handleAddTraining = async () => {
    if (selectedTrainings.length > 0 && rating) {
      // Add each selected training one by one
      for (const training of selectedTrainings) {
        await onSelectBodyPart(training, parseInt(rating))
      }
      setSelectedTrainings([])
      setRating('5')
    }
  }

  const handleDeleteTraining = async (trainingId: string) => {
    if (!onDeleteTraining) return
    
    try {
      setIsDeleting(true)
      await onDeleteTraining(trainingId)
      toast({
        title: 'Training removed',
        status: 'success',
        duration: 2000,
      })
    } catch (error) {
      console.error('Error deleting training:', error)
      toast({
        title: 'Error removing training',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Group training options by category
  const groupedOptions = trainingOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = []
    }
    acc[option.category].push(option)
    return acc
  }, {} as Record<string, typeof trainingOptions>)

  const isTrainingCompleted = (trainingId: string) => {
    return selectedParts.some(part => part.bodyPart === trainingId)
  }

  return (
    <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={6} color={textColor}>Today's Training</Heading>
      
      <SimpleGrid columns={2} spacing={6}>
        {/* Training Log */}
        <Box>
          <Text fontWeight="bold" mb={4} color={textColor}>Completed Training</Text>
          {selectedParts.length === 0 ? (
            <Text color={useColorModeValue('gray.500', 'gray.400')}>No training logged yet today</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {selectedParts.map((part, index) => (
                <HStack key={`${part.bodyPart}-${index}`} p={2} bg={useColorModeValue('gray.50', 'gray.600')} borderRadius="md">
                  <Text color={textColor}>{trainingOptions.find(t => t.id === part.bodyPart)?.label || part.bodyPart}</Text>
                  <Badge colorScheme="purple" ml="auto" mr={2}>{part.rating}/10</Badge>
                  {isCurrentUser && onDeleteTraining && (
                    <IconButton
                      aria-label="Delete training"
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      isLoading={isDeleting}
                      onClick={() => handleDeleteTraining(part.id || '')}
                    />
                  )}
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

        {/* Add Training Form */}
        {isCurrentUser && (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontWeight="bold" mb={4} color={textColor}>
                Select Training ({selectedTrainings.length} selected)
              </Text>
              {Object.entries(groupedOptions).map(([category, options]) => (
                <Box key={category} mb={4}>
                  <Text color={textColor} fontWeight="semibold" mb={2}>{category}</Text>
                  <Wrap spacing={2}>
                    {options.map(option => {
                      const isSelected = selectedTrainings.includes(option.id)
                      const isCompleted = isTrainingCompleted(option.id)
                      return (
                        <WrapItem key={option.id}>
                          <Button
                            size="sm"
                            variant={isSelected ? 'solid' : 'outline'}
                            colorScheme="purple"
                            onClick={() => handleToggleTraining(option.id)}
                            bg={isSelected ? selectedBgColor : buttonBgColor}
                            opacity={isCompleted ? 0.5 : 1}
                            _hover={{
                              opacity: isCompleted ? 0.5 : 0.8
                            }}
                            isDisabled={isCompleted}
                          >
                            {option.label}
                          </Button>
                        </WrapItem>
                      )
                    })}
                  </Wrap>
                </Box>
              ))}
            </Box>

            <Box>
              <Text mb={2} color={textColor}>Rate Selected Training (1-10)</Text>
              <Wrap spacing={2}>
                {[...Array(10)].map((_, i) => (
                  <WrapItem key={i + 1}>
                    <Button
                      size="sm"
                      variant={rating === String(i + 1) ? 'solid' : 'outline'}
                      colorScheme="purple"
                      onClick={() => setRating(String(i + 1))}
                      bg={rating === String(i + 1) ? selectedBgColor : buttonBgColor}
                    >
                      {i + 1}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>

            <Button
              colorScheme="purple"
              onClick={handleAddTraining}
              isDisabled={selectedTrainings.length === 0 || !rating}
            >
              Add {selectedTrainings.length} Training{selectedTrainings.length !== 1 ? 's' : ''}
            </Button>
          </VStack>
        )}
      </SimpleGrid>
    </Box>
  )
}

export default TrainingLog 